import { Router } from 'express';
import { AuthController } from '@/controller/web/Auth.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import { LoginSchema, RegisterSchema, SendEmailCodeSchema } from '@/schemas/auth/auth.web';

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
 * @description: 发送注册邮箱验证码
 * @route POST /web/auth/send-email-code
 */
router.post('/send-email-code', zodValidate({
  body: SendEmailCodeSchema,
}), AuthController.sendEmailCode);

/** 
 * @description: Web端注册，通过邮箱注册
 * @route POST /web/auth/register
 */
router.post('/register', AuthController.register);

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

/**
 * @description: Web端通过GitHub登录
 * @route GET /web/auth/github/callback
 */
router.get('/github/callback', AuthController.loginWithGitHub);

/**
 * @description: Web端通过Google登录
 * @route GET /web/auth/google/callback
 */
router.get('/google/callback', AuthController.loginWithGoogle);

export default router;
