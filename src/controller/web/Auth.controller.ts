import { AuthService } from "@/services/Auth.service";
import type { Request, Response } from "express";


export class AuthController {
  /**
   * 生成 nonce（防重放攻击）
   */
  public static async generateNonce(req: Request, res: Response) {
    try {
      const nonce = await AuthService.generateNonce();
      res.json({
        code: 200,
        success: true,
        message: '生成 nonce 成功',
        data: { nonce },
      });
    } catch (error: any) {
      console.error("生成 nonce 失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '生成 nonce 失败',
        data: null,
      });
    }
  }

  /**
   * 生成图形验证码
   */
  public static async generateCaptcha(req: Request, res: Response) {
    try {
      const result = await AuthService.generateCaptcha();
      res.json({
        code: 200,
        success: true,
        message: '生成验证码成功',
        data: result,
      });
    } catch (error: any) {
      console.error("生成验证码失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '生成验证码失败',
        data: null,
      });
    }
  }

  /**
   * Web端发送注册邮箱验证码
   */
  public static async sendEmailCode(req: Request, res: Response) {
    try {
      const { email, captchaKey, captchaCode } = req.body;
      await AuthService.sendEmailCode({
        email,
        captchaKey,
        captchaCode,
      });
      res.json({
        code: 200,
        success: true,
        message: '邮箱验证码发送成功',
        data: null,
      });
    } catch (error: any) {
      console.error("邮箱验证码发送失败：", error);
      res.status(error.statusCode || 500).json({
        code: error.statusCode || 500,
        success: false,
        message: error.message || '邮箱验证码发送失败',
        data: null,
      });
    }
  }

  /**
   * Web端注册，通过邮箱注册
   */
  public static async register(req: Request, res: Response) {
    try {
      const { nickname, email, emailCode, password, captchaKey, captchaCode, nonce } = req.body;
      console.log(req.body);
      const { user } = await AuthService.register({
        nickname,
        email,
        emailCode,
        password,
        captchaKey,
        captchaCode,
        nonce,
      });

      res.json({
        code: 200,
        success: true,
        message: '注册成功，请前往登录',
        data: {
          user,
        },
      });
    } catch (error: any) {
      console.error("注册失败：", error);
      res.status(error.statusCode || 500).json({
        code: error.statusCode || 500,
        success: false,
        message: error.message || '注册失败',
        data: null,
      });
    }
  }

  /**
   * Web端普通登录
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, captchaKey, captchaCode, nonce, rememberMe } = req.body;
      const { user, tokens } = await AuthService.loginVo({
        email,
        password,
        captchaKey,
        captchaCode,
        nonce,
        rememberMe,
      });

      // 设置 HttpOnly Cookie 存储 refresh token（防止XSS攻击）
      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      };

      // 如果用户选择了“保持登录”，设置 cookie 的过期时间
      if (rememberMe) {
        // config.jwt.refreshExpiresIn 默认是 30 天，rememberMe 我们给了 90 天
        cookieOptions.maxAge = 90 * 24 * 60 * 60 * 1000; // 转成毫秒
      }

      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      res.json({
        code: 200,
        success: true,
        message: '登录成功',
        data: {
          user,
          accessToken: tokens.accessToken,
          // 可以选择不把 refreshToken 放在响应体里，因为已经放 cookie 了
          // refreshToken: tokens.refreshToken, 
        },
      });
    } catch (error: any) {
      console.error("登录失败：", error);
      res.status(error.statusCode || 500).json({
        code: error.statusCode || 500,
        success: false,
        message: error.message || '登录失败',
        data: null,
      });
    }
  }

  /**
   * Web端登出
   */
  public static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (refreshToken || accessToken) {
        await AuthService.logoutVo(accessToken || '', refreshToken || '');
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.json({
        code: 200,
        success: true,
        message: '登出成功',
        data: null,
      });
    } catch (error: any) {
      console.error("登出失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '登出失败',
        data: null,
      });
    }
  }

  /**
   * Web端通过GitHub登录
   */
  public static async loginWithGitHub(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({
          code: 400,
          success: false,
          message: '缺少 GitHub 授权码',
          data: null,
        });
        return;
      }

      const { user, tokens } = await AuthService.loginWithGitHub(code);

      // 设置 HttpOnly Cookie
      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      };
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      res.json({
        code: 200,
        success: true,
        message: 'GitHub 登录成功',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error: any) {
      console.error("GitHub 登录失败：", error);
      res.status(error.statusCode || 500).json({
        code: error.statusCode || 500,
        success: false,
        message: error.message || 'GitHub 登录失败',
        data: null,
      });
    }
  }

  /**
   * Web端通过Google登录
   */
  public static async loginWithGoogle(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({
          code: 400,
          success: false,
          message: '缺少 Google 授权码',
          data: null,
        });
        return;
      }

      const { user, tokens } = await AuthService.loginWithGoogle(code);

      // 设置 HttpOnly Cookie
      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      };
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      res.json({
        code: 200,
        success: true,
        message: 'Google 登录成功',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error: any) {
      console.error("Google 登录失败：", error);
      res.status(error.statusCode || 500).json({
        code: error.statusCode || 500,
        success: false,
        message: error.message || 'Google 登录失败',
        data: null,
      });
    }
  }
}
