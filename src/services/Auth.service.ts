import { User } from '@/models';
import { BadRequestError, UnauthorizedError } from '@/utils/error.util';
import { config } from '@/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SafeUser } from '@/models/User.model';
import { redisClient } from '@/libs/redis';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@/libs/jwt';
import { createCaptcha, verifyCaptcha, CreateCaptchaResult } from '@/libs/captcha';
import { HttpService } from '@/utils/request'
import { RegisterParams, SendEmailCodeParams } from '@/schemas/auth/auth.web';
import { createShortIdCodec } from '@/utils/shortId.codec';
import { sendVerificationCodeEmail } from '@/libs/email';



/** ---------- 类型定义 ---------- */
/** web端safeUser(省去id) */
export type SafeUserWithoutId = Omit<SafeUser, 'id'>

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
    user: SafeUserWithoutId;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    const { email, password, captchaKey, captchaCode, nonce, rememberMe } = params;

    console.log(params)
    
    // 1. 校验参数
    if (!email || !password || !captchaKey || !captchaCode || !nonce) {
      throw new BadRequestError('缺少必要参数');
    }
    
    // 2. 验证 nonce（防重放攻击，优先验证快速失败）
    const nonceKey = `auth:nonce:${nonce}`;
    if (!(await redisClient.get(nonceKey))) {
      throw new BadRequestError('无效的 nonce');
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
    console.log("用户输入密码：", password)
    console.log("当前用户密码：", user.password)
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      throw new UnauthorizedError('邮箱或者密码错误');
    }
    
    // 5. 生成令牌（根据 rememberMe 调整过期时间）
    const jwtPayload: JwtPayload = {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      role: user.role as string,
    };
    
    // rememberMe 为 true 时延长 token 有效期
    // 默认：access 7天，refresh 30天
    // 记住我：access 30天，refresh 90天
    const accessExpiresIn = rememberMe 
      ? 30 * 24 * 60 * 60  // 30天 (秒)
      : config.jwt.accessExpiresIn; // 配置文件里也是秒 (例如 604800)
    const refreshExpiresIn = rememberMe 
      ? 90 * 24 * 60 * 60  // 90天 (秒)
      : config.jwt.refreshExpiresIn; // 配置文件里也是秒 (例如 2592000)
    
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

  /**
   * 发送邮箱验证码
   * @param params 发送参数
   */
  public static async sendEmailCode(params: SendEmailCodeParams): Promise<void> {
    const { email, captchaKey, captchaCode } = params;

    // 1. 验证图形验证码（发送邮件成功后保留验证码，以便注册接口可以再次使用它验证一次，或者直接在前端通过逻辑复用）
    const isCaptchaValid = await verifyCaptcha({
      key: captchaKey,
      code: captchaCode,
    }, true);
    if (!isCaptchaValid) {
      throw new BadRequestError('图形验证码错误或已过期');
    }

    // 3. 检查邮箱是否已注册
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError('该邮箱已被注册，请直接登录');
    }

    // 4. 检查是否发送频繁（例如 60 秒内只能发送一次）
    const emailCodeKey = `auth:email_code:${email}`;
    const ttl = await redisClient.ttl(emailCodeKey);
    if (ttl > 0 && 300 - ttl < 60) {
      throw new BadRequestError('验证码发送过于频繁，请稍后再试');
    }

    // 5. 生成 6 位随机数字验证码
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. 存入 Redis，有效期 5 分钟
    await redisClient.set(emailCodeKey, emailCode, 'EX', 300);

    // 7. 发送邮件
    await sendVerificationCodeEmail(email, emailCode);
  }

  /**
   * Web端注册，通过邮箱注册
   * @param params 注册参数
   * @returns 注册成功返回用户信息（不再自动签发令牌）
   */
  public static async register(params: RegisterParams): Promise<{
    user: SafeUserWithoutId;
  }> {
    const { nickname, email, emailCode, password, captchaKey, captchaCode, nonce } = params;
    console.log('参数：', params)

    // 1. 验证 nonce（防重放攻击）
    if (!(await redisClient.get(`auth:nonce:${nonce}`))) {
      throw new BadRequestError('无效的 nonce，请刷新页面重试');
    }
    await redisClient.del(`auth:nonce:${nonce}`);

    // 2. 验证图形验证码
    const isCaptchaValid = await verifyCaptcha({
      key: captchaKey,
      code: captchaCode,
    });
    if (!isCaptchaValid) {
      throw new BadRequestError('图形验证码错误或已过期');
    }

    // 3. 验证邮箱验证码
    const emailCodeKey = `auth:email_code:${email}`;
    const storedEmailCode = await redisClient.get(emailCodeKey);
    if (!storedEmailCode || storedEmailCode !== emailCode) {
      throw new BadRequestError('邮箱验证码错误或已过期');
    }
    // 验证通过后删除邮箱验证码
    await redisClient.del(emailCodeKey);

    // 4. 检查邮箱是否已存在
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError('该邮箱已被注册，请直接登录');
    }

    // 5. 密码加密并创建用户
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    
    // 生成随机后缀昵称
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    // 生成无横线的 uuid
    const username = crypto.randomUUID().replace(/-/g, '');

    const newUser = await User.create({
      email,
      password,
      username,
      nickname,
      gender: 'other',
      status: 'active',
      role: 'user',
    });

    // 生成对应的 shortId
    const { encode } = createShortIdCodec(config.salt.user);
    const shortId = encode(newUser.id);
    await newUser.update({ shortId });

    // 6. 返回用户信息（不签发 token）
    return {
      user: {
        shortId: newUser.shortId,
        nickname: newUser.nickname,
        email: newUser.email,
        gender: newUser.gender,
        avatar: newUser.avatar,
        bio: newUser.bio,
        createdAt: newUser.createdAt,
      }
    };
  }

  /** 
   * web短登录通过GitHub登录
   * @param code GitHub登录回调参数
   * @returns 登录成功后的用户信息和token
   */
  public static async loginWithGitHub(code: string): Promise<{
    user: SafeUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    // 校验授权码
    if(!code) {
      throw new BadRequestError('缺少必要参数');
    }
    const { clientId, clientSecret, redirectUri } = config.github;

    // 创建GitHub专用HTTP请求实例
    const githubHttp = new HttpService('')

    // 利用code换取GitHub access_token
    const tokenData = await githubHttp.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
      { headers: { Accept: 'application/json' } }
    )

    // 校验令牌结果（HttpService 已直接返回data）
    const { access_token: accessToken, error } = tokenData;
    if(error || !accessToken) {
      throw new BadRequestError('GitHub授权失败：' + (error || '无效授权码'));
    }

    // 获取GitHub用户信息
    const githubUser = await githubHttp.get(
      'https://api.github.com/user',
      undefined,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    // 获取用户的公开或私有邮箱（GitHub用户可能未公开邮箱）
    let email = githubUser.email;
    if (!email) {
      try {
        const emails = await githubHttp.get(
          'https://api.github.com/user/emails',
          undefined,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const primaryEmail = emails.find((e: any) => e.primary);
        if (primaryEmail) email = primaryEmail.email;
      } catch (e) {
        // 获取邮箱失败不中断流程
        console.warn('获取GitHub邮箱失败', e);
      }
    }

    // 根据 githubID查询/创建用户并生成 token
    const result = await User.findOrCreateUserByGithubId({
      githubId: String(githubUser.id),
      githubNickname: githubUser.name || githubUser.login,
      email: email,
      avatar: githubUser.avatar_url,
    });

    return result;
  }

  /** 
   * web端通过Google登录
   * @param code Google登录回调参数
   * @returns 登录成功后的用户信息和token
  */
  public static async loginWithGoogle(code: string): Promise<{
    user: SafeUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    // 校验授权码
    if(!code) {
      throw new BadRequestError('缺少必要参数');
    }
    const { clientId, clientSecret, redirectUri } = config.google;

    // 创建Google专用HTTP请求实例
    const googleHttp = new HttpService('');

    // 利用code换取Google access_token
    const tokenData = await googleHttp.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      },
      { headers: { Accept: 'application/json' } }
    )

    // 校验令牌结果（HttpService 已直接返回data）
    const { access_token: accessToken, error } = tokenData;
    if(error || !accessToken) {
      throw new BadRequestError('Google授权失败：' + (error || '无效授权码'));
    }

    // 获取Google用户信息
    const googleUser = await googleHttp.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      undefined,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 根据 googleId 查询/创建用户并生成 token
    const result = await User.findOrCreateByGoogleId({
      googleId: String(googleUser.sub),
      googleNickname: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.picture,
    });

    return result;
  }
}