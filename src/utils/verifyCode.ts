import { redisClient } from './redis'
import { BadRequestError } from './errors'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { config } from '../config/index';
import { generateDeviceId, RateLimiter } from '../utils/rateLimit'


/**
 * 生成随机数字验证码
 * @param {number} length 验证码长度，默认6位
 * @returns {string} 验证码
 */
export const generateVerifyCode = (length = 6): string => {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  return crypto.randomInt(min, max).toString().padStart(length, '0')
}


/**
 * 发送邮箱验证码
 * @param {string} email 接收验证码的邮箱
 * @returns 成功返回true，失败抛出异常
 */
export const sendVerifyCodeByEmail = async (email: string, ip?: string, userAgent?: string): Promise<boolean> => { 
  try {
    
    console.log('email: ', email);
    console.log('ip: ', ip);
    console.log('userAgent: ', userAgent);

    // 初始化限流工具，防止恶意攻击
    const rateLimiter = new RateLimiter(redisClient, 'send-code')
      .addRule({ dimension: 'ip', expire: 60 * 60, maxCount: 10 })    // 每个 IP 地址，每个小时最多请求10次
      .addRule({ dimension: 'email', expire: 60 * 60 * 24, maxCount: 5 }) // 每个邮箱，每天最多请求5次
      .addRule({ dimension: 'deviceId', expire: 60 * 60, maxCount: 10 }) // 每个设备，每个小时最多请求10次
      .addRule({ dimension: 'ipWithMail', expire: 60 * 30, maxCount: 3 })   // 一个 IP 给同一个邮箱 半小时最多发 3 次验证码。

    // 生成所有维度的标识
    const deviceId = generateDeviceId(ip as string, userAgent as string); // 哈希值处理
    const ipWithMail = `${ip}_${email}`;  // IP+邮箱组合

    await rateLimiter.checkAndIncr({
      ip: ip as string,
      email: email as string,
      deviceId,
      ipWithMail,
    });
    
    
    // 生成6位验证码
    const code = generateVerifyCode()

    // 存储验证码到Redis，设置5分钟有效期（避免重复发送+过期失效）
    await redisClient.set(email, code, "EX", 5 * 60); // EX=过期时间（默认5分钟）

    // 关键：打印完整的 email 配置，重点看 auth！
    console.log("=== 邮箱配置详情 ===");
    console.log("config.email:", config.email);
    console.log("config.email.auth:", config.email.auth); // 必须有 user 和 pass！
    console.log("===================");

    // mailConfig配置信息
    const mailConfig = {
      host: config.email.host,
      port: +config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user?.trim(),
        pass: config.email.auth.pass?.trim()
      },
      from: config.email.from
    }

    // 创建邮箱发送器
    const transport = nodemailer.createTransport(mailConfig)

    // 配置邮件内容
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: '[Saki_SDK个人博客] 注册验证码',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html { line-height: 1.15; -webkit-text-size-adjust: 100%; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }
            a { background-color: transparent; color: inherit; text-decoration: none;}
            table { border-collapse: collapse; }
            ul, ol { list-style: none; padding-left: 0; }
            p { color: inherit; }
            .email { width: 100vw; min-height: 100vh; padding: 20px 30px; }
            .container { width: 100%; max-width: 1500px; margin: 0 auto; @media (max-width: 1536px) { max-width: 1400px; } @media (max-width: 1280px) { max-width: 1100px; } @media (max-width: 1024px) { max-width: 900px; } @media (max-width: 768px) { max-width: 650px; } @media (max-width: 640px) { max-width: 530px; } @media (max-width: 480px) { max-width: 450px; } }
            .email__container { margin: 0 auto; background: white; border: 1px solid #e3e8f7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
            .email__header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
            .logo { font-size: 2rem; font-weight: bold; margin-bottom: 10px; }
            .email-title { font-size: 1.5rem; margin-bottom: 5px; }
            .email-subtitle { opacity: 0.7; font-size: 0.9rem; }
            .email-body { padding: 40px 30px; }
            .greeting { font-size: 1.1rem; margin-bottom: 20px; color: #555; }
            .code-container { background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px; padding: 25px; text-align: center; margin: 30px 0; }
            .code-wrapper { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; }
            .copy-btn { display: felx; justify-content: center; align-items: center; min-width: 50%; background: #3498db; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; }
            .copy-btn:hover { background: #2980b9; transform: translateY(-2px); }
            .copy-btn.copied { background: #27ae60; }
            .copy-btn i { font-size: 1rem; }
            .verification-code { font-size: 3rem; font-weight: bold; letter-spacing: 8px; color: #e74c3c; background: white; padding: 15px; border-radius: 8px; display: inline-block; margin: 10px 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
            .code-hint { color: #6c757d; font-size: 0.9rem; margin-top: 15px; }
            .instructions { background: #e8f4fd; border-left: 4px solid #3498db; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0; }
            .instructions h3 { color: #2c3e50; margin-bottom: 10px; }
            .instructions ul { padding-left: 20px; }
            .instructions li { margin-bottom: 8px; color: #555; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; }
            .warning strong { display: block; margin-bottom: 5px; }
            .email__footer { background: #2c3e50; color: white; padding: 25px 20px; text-align: center; }
            .footer-links, .social-links { margin: 15px 0; }
            .footer-links a, .social-links a { color: #3498db; text-decoration: none; margin: 0 10px;}
            .footer-links a:hover, .social-links a:hover { text-decoration: underline; }
            .copyright { font-size: 0.8rem; opacity: 0.7; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="email">
            <div class="email__container container">
              <div class="email__header"><div class="logo">SAKI_SDK个人博客</div><h1 class="email-title">注册验证码</h1><p class="emial-subtitle">请使用一下验证码完成注册</p></div>
              <div class="email-body">
                <p class="greeting">亲爱的用户，您好！</p>
                <p>感谢您注册 <strong>Saki_SDK个人博客</strong> 账户！</p>
                <p>请使用以下验证码完成注册流程：</p>
                <div class="code-container"><div class="code-wrapper"><div class="verification-code" id="verificationCode">${code}</div></div><p class="code-hint">（此验证码5分钟内有效）</p></div>
                <div class="instructions"><h3>操作指引：</h3><ul><li>返回注册页面</li><li>在验证码输入框中输入上方6位数字</li><li>点击"验证"按钮完成注册</li></ul></div>
                <div class="warning"><strong>安全提示：</strong><span>请勿将此验证码透露给任何人，包括自称客服的人员。Saki_SDK工作人员绝不会向您索要验证码。</span></div>
                <p>如果您没有请求此验证码，请忽略此邮件。</p>
                <p>祝您使用愉快！<br><strong>Saki_SDK</strong></p>
              </div>
              <div class="email__footer">
                <div class="footer-links"><a href="#">联系我们</a> | <a href="#">帮助中心</a> | <a href="#">隐私政策</a> | <a href="#">条款和条件</a></div>
                <div class="social-links"><a href="https://github.com/saki-sdk" target="_blank">GitHub</a></div>
                <div class="copyright">© 2024 Saki_SDK个人博客. 保留所有权利.</div>
              </div>
            </div>
          </div> 
        </body>
        </html>
      `
    }
    // 发送邮件
    await transport.sendMail(mailOptions)
    console.log(`验证码 ${code} 已发送到邮箱 ${email}`)
    return true
  } catch (error: any) {
    console.log("发送邮箱验证码失败：", error);
    throw new BadRequestError(error.message||"发送邮箱验证码失败，请检查邮箱地址是否正确或稍后重试")
  }
}


/**
 * 验证邮箱验证码是否有效 
 * @param {string} email 邮箱地址
 * @param {string} code  用户输入的验证码
 * @returns {boolean} 验证码是否有效，有效返回true，无效抛出异常  
*/
export const validateVerifyCode = async (email: string, code: string): Promise<boolean> => { 
  try {
    // 从Redis中获取存储的验证码
    const storedCode = await redisClient.get(email)

    // 校验验证码
    if (!storedCode) {
      throw new BadRequestError('验证码已过期或无效')
    }

    // 验证码匹配
    if (storedCode !== code) {
      throw new BadRequestError('验证码错误')
    }

    // 验证通过后删除Redis中的验证码（避免重复使用）
    await redisClient.del(email)
    return true
  }catch(error:any) {
    console.log("验证邮箱验证码失败：", error);
    throw error;
  }
}