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
        /** 是否保持登录 */
        rememberMe,
      } = req.body as any;

      // 调用服务层处理登录逻辑
      const { user, tokens } = await AuthService.login({
        email,
        password,
        nonce,
        rememberMe,
      });

      // 设置HttpOnly Cookie 存储 refresh token（防止XSS攻击）
      const cookieOptions: any = {
        httpOnly: true,
        secure: config.env === 'production' && req.secure, // 仅在 https 下启用 secure，防止本地 http 调试无法设置 cookie
        sameSite: 'strict',
      };

      // 如果用户选择了“保持登录”，设置过期时间；否则为会话 Cookie（关闭浏览器失效）
      if (rememberMe) {
        cookieOptions.maxAge = config.jwt.refreshExpiresIn * 1000;
      }

      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

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

  /**
   * 后台管理系统登出
   */
  public static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      
      // 将 token 加入黑名单
      if (refreshToken || accessToken) {
        await AuthService.logout(accessToken || '', refreshToken || '');
      }

      // 清除前端 Cookie 中的 refreshToken
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.env === 'production' && req.secure,
        sameSite: 'strict',
      });

      res.status(200).json({
        code: 200,
        success: true,
        message: '登出成功',
        data: null,
      });
    } catch (error) {
      console.log("登出失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '登出失败',
        data: null,
      });
    }
  }
}