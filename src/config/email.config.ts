/** ---------- 邮箱登录验证配置项类型定义 ---------- */
export type EmailConfig = {
  /** 邮箱 SMTP 服务器主机名 */
  host: string;
  /** 邮箱 SMTP 服务器端口号 */
  port: number;
  /** 是否使用 SSL/TLS 加密连接 */
  secure: boolean;
  /** 邮箱登录认证信息 */
  auth: {
    user: string;
    pass: string;
  };
  /** 发送邮件的默认发件人地址 */
  from: string;
};

/** ---------- 邮箱登录验证配置项 ---------- */
export const config: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.qq.com',
  port: parseInt(process.env.EMAIL_PORT || '465', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || '',
}

export default Object.freeze(config);
