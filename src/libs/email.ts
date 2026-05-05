import nodemailer from 'nodemailer';
import { config } from '@/config';

// 创建邮件发送传输器
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

/**
 * 发送验证码邮件
 * @param to 收件人邮箱
 * @param code 验证码
 */
export const sendVerificationCodeEmail = async (to: string, code: string): Promise<void> => {
  if (!config.email.auth.user || !config.email.auth.pass) {
    console.error('邮件发送失败：缺少 EMAIL_USER 或 EMAIL_PASS 环境变量配置');
    throw new Error('系统邮箱服务未配置，无法发送验证码');
  }

  const mailOptions = {
    from: `"Blog System" <${config.email.from || config.email.auth.user}>`,
    to,
    subject: '您的注册验证码',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>欢迎注册！</h2>
        <p>您的邮箱验证码是：</p>
        <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${code}</h1>
        <p>该验证码在 5 分钟内有效。请勿将验证码泄露给他人。</p>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">如果这不是您的操作，请忽略此邮件。</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('发送邮件失败:', error);
    throw new Error('验证码邮件发送失败，请稍后重试');
  }
};
