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
   * Web端普通登录
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, captchaKey, captchaCode, nonce, rememberMe } = req.body;
      const result = await AuthService.loginVo({
        email,
        password,
        captchaKey,
        captchaCode,
        nonce,
        rememberMe,
      });
      res.json({
        code: 200,
        success: true,
        message: '登录成功',
        data: result,
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
}
