import { sequelize, User } from '../models/index'
import { JwtService, JwtPayload } from '../utils/jwt'
import { UnauthorizedError, BadRequestError } from '../utils/errors'
import { config } from '../config/index'
import crypto from 'crypto'
import { sendVerifyCodeByEmail } from '../utils/verifyCode';
import { validateVerifyCode } from "../utils/verifyCode";
import { ShortIdUtil } from '../utils/shortIdUtil'
import { Transaction } from 'sequelize'

export interface SafeUser {
    shortId: string;
    nickname: string;
    email: string;
    gender: 'male' | 'female' | 'other';
    avatar: string;
    bio: string;
    createdAt: Date;
}

export class AuthService { 
    // 用户注册
    public static async register(data: {
        nickname: string,
        email: string,
        verifyCode: string,
        password: string,
    }): Promise<{
        user: SafeUser;
        tokens: {
            accessToken: string;
            refreshToken: string;
        }
    }> {
        const transaction: Transaction = await sequelize.transaction();
        try {
            // 验证用户名的唯一性
            const existingUsername = await User.findOne({ where: { nickname: data.nickname }, transaction});
            if (existingUsername) {
                throw new BadRequestError('用户名已存在');
            }

            // 验证邮箱的唯一性
            const existingEmail = await User.findOne({ where: { email: data.email }, transaction });
            if (existingEmail) {
                throw new BadRequestError('邮箱已存在');
            }

            // 验证邮箱的验证码
            if (!await validateVerifyCode(data.email, data.verifyCode)) {
                throw new BadRequestError('验证码错误');
            }

            // 创建用户（密码加密会在User模型的beforeCreate钩子中处理）
            const user = await User.create({
                nickname: data.nickname,
                email: data.email,
                password: data.password,
                status: 'active',
            }, {
                transaction
            })

            // 如果创建失败抛出错误
            if (!user) {
                throw new Error('用户创建失败');
            }

            // 然后更新short_id
            const shortId = ShortIdUtil.encodeUserId(user.id);
            await user.update({
                short_id: shortId,
            }, {
                transaction
            })

            // 提交事务
            await transaction.commit();

            // 生成JWT payload（仅包含必要信息，避免敏感数据）
            const payload: JwtPayload = {
                id: user.id,
                username: user.nickname,
                email: user.email,
                role: user.role as string,
            };

            // 生成令牌对
            const accessToken = JwtService.generateAccessToken(payload);
            const refreshToken = JwtService.generateRefreshToken(payload);

            const safeUser = {
                shortId: user.short_id,
                nickname: user.nickname,
                email: user.email,
                gender: user.gender,
                avatar: user.avatar as string,
                bio: user.bio as string,
                createdAt: user.created_at,
            }

            return {
                user: safeUser as SafeUser,
                tokens: { accessToken, refreshToken },
            };
        } catch (error: any) {
            await transaction.rollback();
            throw error;
        }
    }

    /** ---------- web端邮箱注册 ---------- */
    public static async emailRegister(data: {
        nickname: string,
        email: string,
        password: string,
        verifyCode: string,
    }): Promise<{
        user: SafeUser;
        tokens: {
            accessToken: string;
            refreshToken: string;
        }
    }> {
        const transaction: Transaction = await sequelize.transaction();
        try {
            // 验证用户名的唯一性
            const existingUsername = await User.findOne({
                where: { nickname: data.nickname },
                transaction
            });
            if (existingUsername) {
                throw new BadRequestError('用户名已存在');
            }

            // 验证邮箱的唯一性
            const existingEmail = await User.findOne({
                where: { email: data.email },
                transaction
            });
            if (existingEmail) {
                throw new BadRequestError('邮箱已存在');
            }
            // 验证邮箱验证码
            await validateVerifyCode(data.email, data.verifyCode);
            // 创建用户（密码加密会在User模型的beforeCreate钩子中处理）
            const user = await User.create({
                nickname: data.nickname,
                email: data.email,
                password: data.password,
                status: 'active',
            }, {
                transaction
            })

            // 生成短id
            const shortId = ShortIdUtil.encode(user.id);
            await user.update({ short_id: shortId }, { transaction });


            // 提交事务
            await transaction.commit();

            // 生成JWT payload（仅包含必要信息，避免敏感数据）
            const payload: JwtPayload = {
                id: user.id,
                username: user.nickname,
                email: user.email,
                role: user.role as string,
            };

            // 生成令牌对
            const accessToken = JwtService.generateAccessToken(payload);
            const refreshToken = JwtService.generateRefreshToken(payload);

            const safeUser: SafeUser = {
                shortId: user.short_id,
                nickname: user.nickname,
                email: user.email,
                gender: user.gender,
                avatar: user.avatar as string,
                bio: user.bio as string,
                createdAt: user.created_at,
            }

            return {
                user: safeUser as SafeUser,
                tokens: { accessToken, refreshToken },
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /** ---------- 普通邮箱登录 ---------- */
    static async login(query: {
        email: string,
        password: string,
        timestamp: string,
        nonce: string,
        signature: string
    }): Promise<{
        user: User;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }> {
        const { email, password, timestamp, nonce, signature } = query;

        // 1. 防重放攻击：验证时间戳（5分钟内有效）
        const now = Date.now();
        const requestTime = Number(timestamp);
        if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
            throw new BadRequestError('请求已过期，请重新尝试');
        }

        // 2. 验证签名
        // 签名规则：sha256(email + password + timestamp + nonce + signSecret)
        const signStr = `${email}${password}${timestamp}${nonce}${config.signSecret}`
        const validSignature = crypto.createHash('sha256').update(signStr).digest('hex');
        if (signature !== validSignature) {
            throw new BadRequestError('签名验证失败');
        }


        // 3.查询用户，验证用户存在且激活
        const user = await User.findOne({ where: { email } })
        console.log("user: ", user)
        if (!user) {
            throw new BadRequestError('用户不存在');
        }
        if (user.status !== 'active') {
            throw new BadRequestError('用户未激活');
        }

        // 5. 验证密码（User模型的validatePassword方法处理加密对比）
        const isValid = await user.validatePassword(password);
        if (!isValid) {
            throw new BadRequestError('邮箱或密码错误');
        }

        // 4. 生成令牌对
        const payload: JwtPayload = {
            id: user.id,
            username: user.nickname,
            email: user.email,
            role: user.role as string,
        };
        const accessToken = JwtService.generateAccessToken(payload);
        const refreshToken = JwtService.generateRefreshToken(payload);

        // 返回用户信息（已排除密码）和令牌
        return {
            user,
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }

    static async webLogin(query: {
        email: string,
        password: string,
        timestamp: string,
        nonce: string,
        signature: string
    }): Promise<{
        user: SafeUser;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }> {
        const { email, password, timestamp, nonce, signature } = query;

        // 1. 防重放攻击：验证时间戳（5分钟内有效）
        const now = Date.now();
        const requestTime = Number(timestamp);
        if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
            throw new BadRequestError('请求已过期，请重新尝试');
        }

        // 2. 验证签名
        // 签名规则：sha256(email + password + timestamp + nonce + signSecret)
        const signStr = `${email}${password}${timestamp}${nonce}${config.signSecret}`
        const validSignature = crypto.createHash('sha256').update(signStr).digest('hex');
        if (signature !== validSignature) {
            throw new BadRequestError('签名验证失败');
        }


        // 3.查询用户，验证用户存在且激活
        const user = await User.findOne({ where: { email } })
        console.log("user: ", user)
        if (!user) {
            throw new BadRequestError('用户不存在');
        }
        if (user.status !== 'active') {
            throw new BadRequestError('用户未激活');
        }

        // 5. 验证密码（User模型的validatePassword方法处理加密对比）
        const isValid = await user.validatePassword(password);
        if (!isValid) {
            throw new BadRequestError('邮箱或密码错误');
        }

        // 4. 生成令牌对
        const payload: JwtPayload = {
            id: user.id,
            username: user.nickname,
            email: user.email,
            role: user.role as string,
        };
        const accessToken = JwtService.generateAccessToken(payload);
        const refreshToken = JwtService.generateRefreshToken(payload);

        const safeUser: SafeUser = {
            shortId: user.short_id,
            nickname: user.nickname,
            email: user.email,
            gender: user.gender,
            avatar: user.avatar as string,
            bio: user.bio as string,
            createdAt: user.created_at,
        }

        // 返回用户信息（已排除密码）和令牌
        return {
            user: safeUser,
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }

    // 谷歌博客用户(登录/自动注册)
    static async googleLogin(params: {
        googleId: string,
        nickname: string,
        email: string,
        avatar: string,
    }) {
        const { googleId, nickname, email, avatar } = params;
        
        const result = await User.findOrCreateByGoogleId({
            googleId, googleNickname: nickname, email, avatar
        });

        return result;
    }

    // 刷新访问令牌
    static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        if (!refreshToken) {
            throw new UnauthorizedError('请提供刷新令牌');
        }
        // 验证刷新令牌的合法性（JwtService处理签名和过期校验）
        const payload: JwtPayload = JwtService.verifyRefreshToken(refreshToken);

        // 验证用户是否存在且激活
        const user = await User.findByPk(payload.id);
        if (!user) {
            throw new UnauthorizedError('用户不存在');
        }
        if (user.status !== 'active') {
            throw new UnauthorizedError('用户未激活');
        }

        // 生成新的访问令牌
        const newAccessToken = JwtService.generateAccessToken({
            id: user.id,
            username: user.nickname,
            email: user.email,
            role: user.role as string,
        });

        return { accessToken: newAccessToken }
    }

    /**
    * 第一步：发送注册验证码到邮箱
    * @param email 注册邮箱
    * @throws BadRequestError 邮箱已注册/发送失败
    */
    static async sendRegisterVerifyCode(email: string, ip?: string, userAgent?: string): Promise<void> {


        // 先校验邮箱是否已注册
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) throw new BadRequestError('该邮箱已注册，请直接登录');
        
        // 发送验证码（工具函数已处理存入Redis）
        await sendVerifyCodeByEmail(email, ip, userAgent);
    }

    private static formatUserInfo(user: User) {
        const { password, ...userInfo } = user.toJSON();
        return userInfo;
    }
}