import { AuthService } from '@/services/Auth.service';
import { config } from '@/config';
import { Request, Response } from 'express';


export class AuthController {
  /** 
   * 获取唯一 nonce（用于防重放攻击）
   * @returns 生成的 nonce 字符串
  */ 
  public static async getNonce(req: Request, res: Response) {
    try {
      const nonce = await AuthService.generateNonce();
      res.json({
        code: 200,
        message: '获取成功',
        success: true,
        data: {
          nonce
        }
      });
    } catch (error) {
      console.log("获取nonce失败：", error)
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          success: false,
          message: error.message || '获取失败',
          data: null,
        });
      }
    }
  }


  public static async login(req: Request, res: Response) {
    try {
      const {
        /** 邮箱 */
        email,
        /** 密码 */
        password,
        /** 随机数 */
        nonce,
      } = req.body as any;

      // 调用服务层处理登录逻辑
      const { user, tokens } = await AuthService.login({
        email,
        password,
        nonce,
      });

      // 设置HttpOnly Cookie 存储 refresh token（防止XSS攻击）
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        maxAge: config.jwt.refreshExpiresIn * 1000 // 7天过期
      });

      // 返回accessToken和用户信息
      res.json({
        code: 200,
        message: '登录成功',
        success: true,
        data: {
          accessToken: tokens.accessToken,
          expiresIn: config.jwt.accessExpiresIn * 1000,
          user: user
        }
      });
    } catch (error) {
      console.log(error)
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          success: false,
          message: error.message || '登录失败',
          data: null,
        });
      }
    }
  }
}