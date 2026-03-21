import { User } from '@/models';
import { BadRequestError, UnauthorizedError } from '@/utils/error.util';
import { config } from '@/config';
import crypto from 'crypto';
import { SafeUser } from '@/models/User.model';
import { redisClient } from '@/libs/redis';


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
  /** 验证码 */
  captcha: string;
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
   * 后台管理系统登出
   * @param refreshToken 用户的 refreshToken
   */
  static async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      // 验证 token 的合法性（提取 payload）
      // 注意：这里即便 token 过期了，如果是恶意用户拿着过期的去请求，也会抛错
      // 但对于正常的登出流程，只要能解析出内容，我们就可以将其加入黑名单或者直接在前端清除
      
      // 如果你想在 Redis 中做强校验（黑名单机制）：
      // 1. 解析 token 获取 jti (JWT ID) 或者 exp
      // 2. 将 token 存入 Redis，设置过期时间等于 token 的剩余有效期
      // await redisClient.set(`auth:blacklist:${refreshToken}`, '1', 'EX', remainingTime);
      
      // 目前最简单的做法：因为后端没有维护 token 状态，真正的注销动作主要靠前端清除 Cookie 和 localStorage。
      // 所以服务层这里可以直接放行，或者你可以在这里实现将 Token 加入 Redis 黑名单的逻辑。
      console.log('用户请求登出，refreshToken:', refreshToken);
    } catch (error) {
      // 忽略无效 token 的错误
      console.warn('登出时解析 token 失败:', error);
    }
  }

  /** ---------- 前台Web端第三方登录 ---------- */

  /**
   * Web端普通登录
   * @params params 登录参数 {email, password, captcha, rememberMe}
   */
  static async webLogin(params: LoginParamsVo) {
    const { email, password, captcha, rememberMe } = params;
    // 校验参数
    if (!email || !password || !captcha) {
      throw new BadRequestError('缺少必要参数');
    }
    
  }

  /** QQ登录 */
  static async qqLogin(params: {
    qqId: string,
    nickname: string,
    email: string,
    avatar: string,
  }) {
    const { qqId, nickname, email, avatar } = params;


    
  }
}
