import { Router } from 'express';
import { AuthController } from '@/controller/web/Auth.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import { LoginSchema } from '@/schemas/auth/auth.web';

/** 路由 */
const router: Router = Router();

/**
 * @description: 生成 nonce（防重放攻击）
 * @route GET /web/auth/nonce
 */
router.get('/nonce', AuthController.generateNonce);

/**
 * @description: 生成图形验证码
 * @route GET /web/auth/captcha
 */
router.get('/captcha', AuthController.generateCaptcha);

/**
 * @description: Web端普通登录
 * @route POST /web/auth/login
 */
router.post('/login', zodValidate({
  body: LoginSchema,
}), AuthController.login);

/**
 * @description: Web端登出
 * @route POST /web/auth/logout
 */
router.post('/logout', AuthController.logout);

export default router;
