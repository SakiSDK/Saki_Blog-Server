import { HttpService } from './../utils/request';
import { Request, Response } from "express";
import crypto from 'crypto'
import { config } from '../config/index';
import qs from 'querystring';
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import Joi from "joi";
import { AuthService } from "../services/Auth.service";


/** ---------- 类型定义 ---------- */
// 扩展Request类型以包含session
declare module 'express-session' {
    interface SessionData {
        googleAuthState: string | null;
        googleAuthStateTimestamp: number | undefined | null; // 新增这一行
    }
}


export class GoogleAuthController {
    public static async getGoogleAuthUrl(req: Request, res: Response) {
        try {
            console.log('获取谷歌登录授权连接')

            // 确保会话已初始化
            if (!req.session) throw new Error('会话未初始化');

            // 生成state参数（防 CSRF攻击，随机字符串）
            const state = crypto.randomUUID().replace(/-/g, '');

            // 显式保存到会话
            req.session.googleAuthState = state;

            // 添加时间戳用于过期检查（可选）
            req.session.googleAuthStateTimestamp = Date.now();
            req.session.save();

            // 手动保存回话以确保状态被持久化
            await new Promise<void>((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('保存会话失败: ', err)
                        reject(err);
                    } else {
                        console.log('会话保存成功. state: ', state);
                        resolve();
                    }
                });
            })

            // 谷歌授权页固定地址（OAuth2.0 授权码模式）
            const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

            // 拼接授权页固定地址
            const params = qs.stringify({
                client_id: config.google.clientId,
                redirect_uri: config.google.redirectUri,
                response_type: 'code',          // 授权模式：授权码模式
                scope: 'openid email profile',  // 申请权限：openid（必选）+ 个人资料 + 邮箱
                state: state,                   // 防 CSRF 随机串
                access_type: 'online',          // 授权类型：online（默认，无需离线访问）
                prompt: 'select_account',       // 强制用户选择账号（可选，避免自动登录旧账号）
            });

            res.status(200).json({
                message: '获取谷歌登录授权连接成功',
                data: {
                    authUrl: `${googleAuthUrl}?${params}`
                }
            })
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: '获取谷歌登录授权连接失败',
                error: error.message
            })
        }
    }

    public static async googleAuthCallback(req: Request, res: Response) {
        try {
            console.log('谷歌回调 Query: ', req.query);
            // 验证请求参数
            const schema = Joi.object({
                code: Joi.string().required().messages({
                    'any.required': '授权码缺失',
                    'string.empty': '授权码不能为空',
                    'string.base': '授权码必须为字符串',
                }),
                state: Joi.string().required().messages({
                    'any.required': '状态参数缺失',
                    'string.empty': '状态参数不能为空',
                    'string.base': '状态参数必须为字符串',
                }),
                scope: Joi.string().optional(),
                prompt: Joi.string().optional(),
                authuser: Joi.string().optional(),
            }).unknown(true);
            const { error, value } = schema.validate(req.query);
            if (error) throw new BadRequestError(error.message);
            
            const { code, state: callbackState } = value; // 谷歌回到携带的参数

            // 检测会话是否存在
            if (!req.session) throw new UnauthorizedError('会话不存在');

            console.log('req.session: ', req.session)
            console.log('存储的state: ', req.session.googleAuthState)
            console.log('回调的state: ', callbackState)

            // 验证state参数 - 修复验证逻辑
            if (!callbackState) throw new BadRequestError('state参数缺失');
            
            const storedState = req.session.googleAuthState;
            if (!storedState) throw new UnauthorizedError('会话中未找到state，可能已过期');
            
            if (storedState !== callbackState) {
                console.error(`State 不匹配: 存储的=${storedState}, 回调的=${callbackState}`);
                throw new UnauthorizedError('CSRF验证失败');
            }

            // 添加过期检查（可选，推荐）
            const stateTimestamp = req.session.googleAuthStateTimestamp;
            if (stateTimestamp && Date.now() - stateTimestamp > 10 * 60 * 1000) { // 10分钟过期
                throw new UnauthorizedError('state已过期，请重新发起授权');
            }

            // 清除已使用的state
            req.session.googleAuthState = null;
            req.session.googleAuthStateTimestamp = null;

            // 手动保存会话变更
            await new Promise<void>((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('清除state时保存会话失败: ', err);
                        reject(err);
                    } else {
                        console.log('state清除成功');
                        resolve();
                    }
                });
            });

            // 使用谷歌授权码获取访问令牌
            const baseUrl = 'https://oauth2.googleapis.com';
            const httpservice = new HttpService(baseUrl);
            const tokenRes = await httpservice.post('/token', qs.stringify({
                client_id: config.google.clientId,
                client_secret: config.google.clientSecret,
                code: code,
                redirect_uri: config.google.redirectUri,
                grant_type: 'authorization_code',
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            const { access_token, id_token } = tokenRes;
            if (!access_token) throw new UnauthorizedError('获取谷歌访问令牌失败');
            
            // 用access_token获取用户信息
            const userInfoUrl = 'https://www.googleapis.com';
            const userService = new HttpService(userInfoUrl);
            const userInfoRes = await userService.get(
                '/oauth2/v3/userinfo',
                undefined,
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                }
            )
            const googleUser = userInfoRes;

            // 关联博客用户
            const { user, tokens } = await AuthService.googleLogin({
                googleId: googleUser.sub,       // 谷歌登录用户ID（全局唯一）
                nickname: googleUser.name,      // 谷歌登录用户昵称
                email: googleUser.email,        // 谷歌登录用户邮箱
                avatar: googleUser.picture,     // 谷歌登录用户头像
            })

            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: config.env === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                path: '/api/v1/web/auth/refresh-token'
            })

            // 构建前端需要的参数（只传递accessToken和用户信息，refreshToken已在Cookie）
            const frontendData = {
                user: {
                    shortId: user.short_id,
                    username: user.username,
                    email: user.email,
                    gender: user.gender,
                    avatar: user.avatar,
                    bio: user.bio,
                    createdAt: user.created_at,
                },
                expiresIn: 60 * 60 * 24 * 7,            // 7 天有效期（和邮箱登录一致）
                accessToken: tokens.accessToken,
                message: '谷歌登录成功',
            }

            const redirectUrl = `${config.frontendUrl}/auth/google-callback?` + qs.stringify({
                data: JSON.stringify(frontendData),
                success: 'true',
            })

            console.log('🚀 重定向到前端，已设置 refreshToken Cookie');
            res.redirect(redirectUrl);
        } catch (error: any) {
            console.error('谷歌授权回调失败：', error);
            const errorRedirectUrl = `${config.frontendUrl}/auth?` + + qs.stringify({
                error: encodeURIComponent(error.message || '谷歌登录失败'),
                success: 'false'
            })
            res.redirect(errorRedirectUrl);
        }
    }

    /** 
    * 验证 id_token的合法性
    * @description 作用：确保用户信息是谷歌官方返回的，防止伪造
    */
    private static async verifyIdToken(idToken: string) {
        try {
            const verifyUrl = 'https://oauth2.googleapis.com';
            const httpService = new HttpService(verifyUrl);
            const verifyResponse = await httpService.get(`/tokeninfo?id_token=${idToken}`);
            const payload = verifyResponse.data;
            // 验证 client_id 匹配（确保 token 是当前应用的）
            if (payload.aud !== config.google.clientId) {
                throw new UnauthorizedError('id_token 非法，应用不匹配');
            }
            return payload;
        } catch (error) {
            throw new UnauthorizedError('id_token 验证失败');
        }
    }
}