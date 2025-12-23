// import { Request, Response, NextFunction } from "express";
// import { BadRequestError, UnauthorizedError } from "../utils/errors";
// import { AuthService } from '../services/Auth.service';
// import { config } from "../config/index";
// import { authLoginSchema, authRegisterSchema, authWebLoginSchema, sendVerifyCodeSchema } from "../validators/auth.schema";
// import { createCaptcha, verifyCaptcha } from "../utils/captcha";




// export class AuthController { 
//     // 生成验证码图像
//     static async captcha(req: Request, res: Response): Promise<void> {
//         try {
//             // 生成验证码
//             const { key, svg } = createCaptcha();

//             // 通过响应头把验证码 key 传给前端
//             res.setHeader('X-Captcha-Key', key);
//             res.setHeader('X-Captcha-Image', svg);

//             // 设置安全响应头, (防止缓存和XSS风险)
//             res.setHeader('Content-Type', 'image/svg+xml');                       // SVG正确的MINE类型
//             res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');// 禁用缓存，验证码一次性有效
//             res.setHeader('Pragma', 'no-cache');                                  // 兼容旧浏览器
//             res.setHeader('X-XSS-Protection', '1; mode=block');                   // 启用XSS保护
//             res.setHeader('X-Content-Type-Options', 'nosniff')                    // 防止浏览器嗅探文件类型

//             // 返回验证码图像
//             res.status(200).send(svg);
//         } catch (error: any) {
//             res.status(error.status || 500).json({})
//             const status = error.status || 500;
//             const message = error.message || '验证码生成失败，请重试';
//             res.status(status).json({
//                 code: status,
//                 message,
//                 data: null
//             });
//         }
//     }

//     /**
//     * 接口1：发送注册验证码
//     * 请求方式：POST
//     * 请求路径：/api/v1/auth/send-verify-code
//     * 请求体：{ email: "用户邮箱" }
//     */
//     static async sendRegisterVerifyCode(req: Request, res: Response): Promise<void> {
//         try {
//             // 检验请求体
//             const { error, value } = sendVerifyCodeSchema.validate(req.body);
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             console.log('[AuthController.sendRegisterVerifyCode]: ', req.body)

//             // 调用服务层发送验证码
//             await AuthService.sendRegisterVerifyCode(value.email, req.ip, req.headers['user-agent']);

//             res.status(200).json({
//                 message: '发送注册验证码成功, 请在5分钟内使用',
//             });
//         } catch (error: any) {
//             console.error('[AuthController.sendRegisterVerifyCode]: ', error.message);
//             res.status(error.status || 500).json({
//                 message: error.message || '发送注册验证码失败',
//             })
//         }
//     }

//     // 用户登录接口
//     static async login(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error } = authLoginSchema.validate(req.body);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');

//             /**
//              * email: 邮箱
//              * password: 密码
//              * timestamp: 时间戳
//              * nonce: 随机字符串，用于防重放攻击
//              * signature: 签名，用于校验请求的合法性
//              */
            
//             // 验证请求参数合法性
//             const { email, password, timestamp, nonce, signature, client, captcha, captcha_key } = req.body;
            
//             if (client === 'web') {
//                 const isCaptchaValid = verifyCaptcha({ key: captcha_key, code: captcha });
//                 if (!isCaptchaValid) throw new UnauthorizedError('验证码错误或已过期，请重新获取');
//             }

//             // 调用服务层处理登录逻辑
//             const { user, tokens } = await AuthService.login({
//                 email,
//                 password,
//                 timestamp,
//                 nonce,
//                 signature
//             });

//             // 验证用户是否是管理员
//             if (client === 'admin' && user.role !== 'admin') {
//                 throw new UnauthorizedError('用户无权限访问此接口，你是管理员吗你就登？');
//             }

//             // 设置HttpOnly Cookie 存储 refresh token（防止XSS攻击）
//             res.cookie('refreshToken', tokens.refreshToken, {
//                 httpOnly: true,                         // 设置为HttpOnly，禁止前端JS访问
//                 secure: config.env === 'production',    // 在生产环境使用HTTPS
//                 maxAge: 30 * 24 * 60 * 60 * 1000,       // 30天有效期（与refreshToken相同）
//                 sameSite: 'lax',                        // 限制跨域请求携带
//                 path: '/api/v1/web/auth/refresh-Token'  // 只允许刷新接口使用
//             })

//             // 返回accessToken 和 用户信息（accessToken存储在内存中）
//             res.status(201).json({
//                 message: '登录成功',
//                 data: {
//                     user,
//                     accessToken: tokens.accessToken,
//                     expiresIn:  60 * 60 * 24 * 7, // 7天
//                 },
//             })
//         } catch (error: any) {
//             console.error('[AuthController.login]: ', error);
//             res.status(error.status || 500).json({ message: error.message });
//         }
//     }

//     static async webLogin(req: Request, res: Response) {
//         try {
//             // 验证请求参数
//             const { error } = authWebLoginSchema.validate(req.body);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');

//             /**
//              * email: 邮箱
//              * password: 密码
//              * timestamp: 时间戳
//              * nonce: 随机字符串，用于防重放攻击
//              * signature: 签名，用于校验请求的合法性
//              */
            
//             // 验证请求参数合法性
//             const { email, password, timestamp, nonce, signature, captcha, captcha_key } = req.body;
            
//             const isCaptchaValid = verifyCaptcha({ key: captcha_key, code: captcha });
//             if (!isCaptchaValid) throw new UnauthorizedError('验证码错误或已过期，请重新获取');

//             // 调用服务层处理登录逻辑
//             const { user, tokens } = await AuthService.webLogin({
//                 email,
//                 password,
//                 timestamp,
//                 nonce,
//                 signature
//             });

//             // 设置HttpOnly Cookie 存储 refresh token（防止XSS攻击）
//             res.cookie('refreshToken', tokens.refreshToken, {
//                 httpOnly: true,                         // 设置为HttpOnly，禁止前端JS访问
//                 secure: config.env === 'production',    // 在生产环境使用HTTPS
//                 maxAge: 30 * 24 * 60 * 60 * 1000,       // 30天有效期（与refreshToken相同）
//                 sameSite: 'lax',                        // 限制跨域请求携带
//                 path: '/api/v1/web/auth/refresh-Token'  // 只允许刷新接口使用
//             })

//             // 返回accessToken 和 用户信息（accessToken存储在内存中）
//             res.status(201).json({
//                 message: '登录成功',
//                 data: {
//                     user,
//                     accessToken: tokens.accessToken,
//                     expiresIn:  60 * 60 * 24 * 7, // 7天
//                 },
//             })
//         } catch (error: any) {
//             console.error('[AuthController.login]: ', error);
//             res.status(error.status || 500).json({ message: error.message });
//         }
//     }

//     // 用户注册
//     static async register(req: Request, res: Response): Promise<void> { 
//         try {
//             console.log(req.body)

//             // 验证请求参数合法性
//             const { error } = authRegisterSchema.validate(req.body);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');

//             const { nickname, email, password, verifyCode } = req.body;

//             // 调用服务层处理注册逻辑
//             const { user, tokens } = await AuthService.emailRegister({
//                 nickname,
//                 email,
//                 verifyCode,
//                 password,
//             });

//             // 设置HttpOnly Cookie 存储 refresh token（防止XSS攻击）
//             res.cookie('refreshToken', tokens.refreshToken, {
//                 httpOnly: true,
//                 secure: config.env === 'production',
//                 maxAge: 30 * 24 * 60 * 60 * 1000, //30天
//                 sameSite: 'lax',
//                 path: '/api/v1/web/auth/refreshAccessToken' // 只允许刷新接口使用
//             })

//             // 返回accessToken 和 用户信息（accessToken存储在内存中）
//             res.status(201).json({
//                 message: '注册成功',
//                 user,
//                 accessToken: tokens.accessToken,
//                 expiresIn:  60 * 60 * 24 * 7,
//             });
//         } catch (error: any) {
//             console.error('[AuthController.register]: ', error);
//             res.status(error.status || 500).json({
//                 message: error.message
//             });
//         }
//     }
    

//     // 刷新访问令牌
//     static async refreshToken(req: Request, res: Response): Promise<void> { 
//         try {
//             // 从Cookie中获取刷新令牌，并验证
//             const refreshToken = req.cookies?.refreshToken;
//             if (!refreshToken) throw new BadRequestError('刷新令牌不存在');

//             // 调用服务层刷新令牌
//             const { accessToken } = await AuthService.refreshToken(refreshToken);

//             // 返回新的访问令牌
//             res.status(200).json({
//                 accessToken,
//                 message: '刷新访问令牌成功',
//                 expiresIn: config.jwt.accessExpiresIn,
//             });
//         } catch (error: any) {
//            // 清除 refreshToken cookie
//             res.clearCookie('refreshToken', {
//                 httpOnly: true,
//                 secure: config.env === 'production',
//                 sameSite: 'lax',
//                 path: '/api/v1/web/auth/refreshToken',
//             });
//             res.status(error.status || 401).json({
//                 message: error.message || '刷新令牌失败'
//             });
//         }
//     }

//     // 退出登录
//     static async logout(req: Request, res: Response): Promise<void> {
//         console.log('[AuthController.logout]: ', req)
//         // 清除 refreshToken cookie
//         res.clearCookie('refreshToken', {
//             httpOnly: true,
//             secure: config.env === 'production',
//             sameSite: 'lax',
//             path: '/api/v1/web/auth/refreshToken',
//         });
//         res.status(200).json({
//             message: '退出登录成功'
//         });
//     }
// }