import { Router } from 'express'
import { AuthController } from '../../controller/Auth.controller'
import { GoogleAuthController } from '../../controller/Google.controller';


const router: Router = Router()

// 登录
router.post('/login', AuthController.webLogin);

// 注册
router.post('/register', AuthController.register);

// 刷新令牌
router.post('/refresh-token', AuthController.refreshToken);

// 登出
router.get('/logout', AuthController.logout);

// 验证码图
router.get('/captcha', AuthController.captcha);

// 邮箱发送验证码
router.post('/send-verify-code', AuthController.sendRegisterVerifyCode)

// 获取谷歌授权链接（前端调用）
router.get('/google/url', GoogleAuthController.getGoogleAuthUrl);

// 谷歌登录回调（谷歌配置的 redirect_uri 指向该路由）
router.get('/google/callback', GoogleAuthController.googleAuthCallback);

export default router