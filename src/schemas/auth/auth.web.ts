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

/** 注册请求参数 */
export const RegisterSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空'),
  email: z.string().email('邮箱格式不正确'),
  emailCode: z.string().length(6, '邮箱验证码应为6位数字'),
  password: z.string().min(6, '密码至少6位').max(100, '密码最长100位'),
  captchaKey: z.string().min(1, '图形验证码key不能为空'),
  captchaCode: z.string().min(1, '图形验证码不能为空'),
  nonce: z.string().min(1, 'nonce不能为空'),
});

export type RegisterParams = z.infer<typeof RegisterSchema>;

/** 发送邮箱验证码请求参数 */
export const SendEmailCodeSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  captchaKey: z.string().min(1, '图形验证码key不能为空'),
  captchaCode: z.string().min(1, '图形验证码不能为空'),
});

export type SendEmailCodeParams = z.infer<typeof SendEmailCodeSchema>;
