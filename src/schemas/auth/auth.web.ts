import { z } from 'zod';

/** 登录请求参数 */
export const LoginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  captchaKey: z.string().min(1, '验证码key不能为空'),
  captchaCode: z.string().min(1, '验证码不能为空'),
  nonce: z.string().min(1, 'nonce不能为空'),
  rememberMe: z.boolean().optional(),
});

export type LoginParams = z.infer<typeof LoginSchema>;
