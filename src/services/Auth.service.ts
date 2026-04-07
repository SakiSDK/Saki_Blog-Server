import { User } from '@/models';
import { BadRequestError, UnauthorizedError } from '@/utils/error.util';
import { config } from '@/config';
import crypto from 'crypto';
import { SafeUser } from '@/models/User.model';
import { redisClient } from '@/libs/redis';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@/libs/jwt';
import { createCaptcha, verifyCaptcha, CreateCaptchaResult } from '@/libs/captcha';


/** ---------- 类型定义 ---------- */
/** 登录请求参数 */ 
export type LoginParams = {
  email: string;
  password: string;
  nonce: string;
  rememberMe?: boolean;
}
/** web登录请求参数 */
export interface LoginParamsVo {
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 验证码 key */
  captchaKey: string;
  /** 验证码 */
  captchaCode: string;
  /** 防重放攻击 nonce */
  nonce: string;
  /** 是否保持登录 */
  rememberMe?: boolean;
}


export class AuthService { 
  
  /** 
   * 生成唯一 nonce（用于防重放攻击）
   * @returns 生成的 nonce 字符串
   */
  public static async generateNonce(): Promise<string> {
    const nonce = crypto.randomBytes(16).toString('hex');
    await redisClient.set(`auth:nonce:${nonce}`, '1', 'EX', 300); // 5分钟过期
    return nonce;
  }

  /** ---------- 后台管理系统登录 ---------- */
  /** 
   * 后台管理系统登录
   * @param params 登录参数
   * @returns 登录成功返回用户信息和令牌对
   */
  static async login(params: LoginParams): Promise<{
    user: SafeUser,
    tokens: {
      accessToken: string,
      refreshToken: string,
    }
  }> { 
    const { email, password, nonce } = params;
    
    // 校验参数
    if (!email || !password || !nonce) {
      throw new BadRequestError('缺少必要参数');
    }

    // 验证 nonce
    if (!(await redisClient.get(`auth:nonce:${nonce}`))) {
      throw new BadRequestError('无效的 nonce');
    } else {
      await redisClient.del(`auth:nonce:${nonce}`);
    }

    return User.validateCredentials(email, password);
  }

  /** 
   * 将 token 加入黑名单
   * @param token JWT token
   */
  private static async addTokenToBlacklist(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      
      if (decoded?.exp) {
        const now = Math.floor(Date.now() / 1000);
        const remainingTime = decoded.exp - now;
        
        if (remainingTime > 0) {
          const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
          
          await redisClient.set(
            `auth:blacklist:${tokenHash}`,
            '1',
            'EX',
            remainingTime
          );
        }
      }
    } catch (error) {
      console.warn('将 token 加入黑名单失败:', error);
    }
  }

  /** 
   * 后台管理系统登出
   * @param accessToken 用户的 accessToken
   * @param refreshToken 用户的 refreshToken
   */
  static async logout(accessToken: string, refreshToken: string): Promise<void> {
    // 将两个 token 都加入黑名单
    if (accessToken) {
      await this.addTokenToBlacklist(accessToken);
    }
    if (refreshToken) {
      await this.addTokenToBlacklist(refreshToken);
    }
  }

  /** ---------- 前台Web端第三方登录 ---------- */
  /** 
   * web端验证码
   * @description 通过redis存储验证码，并返回验证码图片base64
   */
  static async generateCaptcha(): Promise<CreateCaptchaResult> {
    return createCaptcha();
  }

  /**
   * Web端普通登录
   * @params params 登录参数 {email, password, captchaKey, captchaCode, nonce, rememberMe}
   */
  static async loginVo(params: LoginParamsVo): Promise<{
    user: SafeUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    const { email, password, captchaKey, captchaCode, nonce, rememberMe } = params;
    
    // 1. 校验参数
    if (!email || !password || !captchaKey || !captchaCode || !nonce) {
      throw new BadRequestError('缺少必要参数');
    }
    
    // 2. 验证 nonce（防重放攻击，优先验证快速失败）
    const nonceKey = `auth:nonce:${nonce}`;
    if (!(await redisClient.get(nonceKey))) {
      throw new BadRequestError('无效的请求');
    }
    await redisClient.del(nonceKey);  // 一次性使用
    
    // 3. 验证验证码
    const isValidCaptcha = await verifyCaptcha({ key: captchaKey, code: captchaCode });
    if (!isValidCaptcha) {
      throw new BadRequestError('验证码错误或已过期');
    }
    
    // 4. 验证用户凭据
    const user = await User.findOne({ where: { email, status: 'active' } });
    if (!user) {
      throw new UnauthorizedError('用户不存在或未激活');
    }
    if (!user.password) {
      throw new UnauthorizedError('该账号为第三方登录，请直接通过对应平台登录');
    }
    
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      throw new UnauthorizedError('用户名或者密码错误');
    }
    
    // 5. 生成令牌（根据 rememberMe 调整过期时间）
    const jwtPayload: JwtPayload = {
      id: user.id,
      nickname: user.username,
      email: user.email,
      role: user.role as string,
    };
    
    // rememberMe 为 true 时延长 token 有效期
    // 默认：access 7天，refresh 30天
    // 记住我：access 30天，refresh 90天
    const accessExpiresIn = rememberMe 
      ? 30 * 24 * 60 * 60  // 30天
      : config.jwt.accessExpiresIn;
    const refreshExpiresIn = rememberMe 
      ? 90 * 24 * 60 * 60  // 90天
      : config.jwt.refreshExpiresIn;
    
    const accessToken = jwt.sign(
      jwtPayload,
      config.jwt.accessSecret,
      { expiresIn: accessExpiresIn, issuer: config.jwt.issuer }
    );
    const refreshToken = jwt.sign(
      { ...jwtPayload, tokenType: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: refreshExpiresIn, issuer: config.jwt.issuer }
    );
    
    return {
      user: {
        id: user.id,
        shortId: user.shortId,
        nickname: user.nickname,
        email: user.email,
        gender: user.gender,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  /** 
   * web端登出逻辑
   * @param accessToken 用户的 accessToken
   * @param refreshToken 用户的 refreshToken
   */
  static async logoutVo(accessToken: string, refreshToken: string): Promise<void> {
    return this.logout(accessToken, refreshToken);
  }
}