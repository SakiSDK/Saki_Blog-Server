import svgCaptcha, { CaptchaObj } from 'svg-captcha';
import { redisClient } from './redis';
import crypto from 'crypto';


/** ---------- 类型定义 ---------- */
export interface CreateCaptchaResult {
  /** 验证码唯一标识 */
  captchaKey: string;
  /** SVG 图片字符串 */
  captchaImage: string;
}

export interface VerifyCaptchaParams {
  /** 验证码唯一标识 */
  key: string;
  /** 用户输入的验证码 */
  code: string;
}


/** ---------- 配置项 ---------- */
const CAPTCHA_CONFIG = {
  /** 验证码类型：char(字符) | math(数学运算) */
  type: 'math' as 'char' | 'math',
  /** 验证码长度 */
  length: 4,
  /** 干扰线数量 */
  noise: 3,
  /** 背景颜色 */
  background: '#f5f7fa',
  /** 是否使用彩色字符 */
  color: true,
  /** 验证码有效期（秒） */
  expireSeconds: 5 * 60,  // 5分钟
  /** Redis key 前缀 */
  keyPrefix: 'captcha:',
};


/** ---------- 私有方法 ---------- */
/**
 * 生成唯一验证码 Key
 */
const generateCaptchaKey = (): string => {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `${CAPTCHA_CONFIG.keyPrefix}${uuid}`;
};

/**
 * 过滤易混淆字符（如 0O1l 等）
 */
const filterConfusableChars = (text: string): string => {
  const confusableChars = /[0O1l6b8B9q]/g;
  const validChars = '23457acdefghijkmnpqrstuvwxyz';
  return text.replace(confusableChars, () =>
    validChars[Math.floor(Math.random() * validChars.length)]
  );
};

/**
 * 生成自定义数学运算表达式
 * 支持加、减、乘、除，满足以下约束：
 * 1. 减法：被减数 >= 减数，结果不为负数
 * 2. 乘法：乘数较小，通常在 1-9 之间
 * 3. 除法：被除数必须能被除数整除
 */
const generateCustomMathExpr = (): { text: string; data: string } => {
  const operators = ['+', '-', '*', '/'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let num1 = 0;
  let num2 = 0;
  let result = 0;
  let expression = '';

  switch (operator) {
    case '+':
      num1 = Math.floor(Math.random() * 20) + 1; // 1-20
      num2 = Math.floor(Math.random() * 20) + 1; // 1-20
      result = num1 + num2;
      expression = `${num1}+${num2}=?`;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 20) + 1; // 1-20
      num2 = Math.floor(Math.random() * num1) + 1; // 保证 num1 >= num2
      result = num1 - num2;
      expression = `${num1}-${num2}=?`;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 9) + 1; // 1-9
      num2 = Math.floor(Math.random() * 9) + 1; // 1-9
      result = num1 * num2;
      expression = `${num1}*${num2}=?`;
      break;
    case '/':
      num2 = Math.floor(Math.random() * 9) + 1; // 1-9 (除数不能为0)
      result = Math.floor(Math.random() * 9) + 1; // 商 1-9
      num1 = num2 * result; // 被除数，保证能整除
      expression = `${num1}/${num2}=?`;
      break;
  }

  return {
    text: result.toString(),
    data: expression,
  };
};


/** ---------- 公开方法 ---------- */
/**
 * 生成图形验证码
 * @returns 验证码 key 和 SVG 图片
 */
export const createCaptcha = async (): Promise<CreateCaptchaResult> => {
  try {
    let captcha: CaptchaObj;

    if (CAPTCHA_CONFIG.type === 'char') {
      // 字符验证码
      captcha = svgCaptcha.create({
        noise: CAPTCHA_CONFIG.noise,
        color: CAPTCHA_CONFIG.color,
        size: CAPTCHA_CONFIG.length,
        width: 140,
        height: 50,
        fontSize: 50,
        background: CAPTCHA_CONFIG.background,
        ignoreChars: '0O1l6b8B9q',
      });
    } else {
      // svgCaptcha 本身导出的默认函数可以接收自定义文本 (text, options) 返回 SVG 字符串
      const mathExpr = generateCustomMathExpr();
      
      const svgString = (svgCaptcha as any)(mathExpr.data, {
        noise: CAPTCHA_CONFIG.noise,
        color: CAPTCHA_CONFIG.color,
        background: CAPTCHA_CONFIG.background,
        width: 140,
        height: 50,
        fontSize: 40,
      });

      // 手动构造符合 CaptchaObj 接口的返回结果
      captcha = {
        text: mathExpr.text, // 正确的数学答案
        data: svgString,     // 生成的数学题图片
      };
    }

    // 处理验证码结果
    const processedCode = CAPTCHA_CONFIG.type === 'math'
      ? captcha.text.toLowerCase()  // math 模式下 text 是计算结果
      : filterConfusableChars(captcha.text).toLowerCase();

    // 生成 key 并存储到 Redis
    const fullKey = generateCaptchaKey();
    const shortKey = fullKey.replace(CAPTCHA_CONFIG.keyPrefix, '');  // 返回给前端的是短 key

    await redisClient.set(fullKey, processedCode, 'EX', CAPTCHA_CONFIG.expireSeconds);

    return { captchaKey: shortKey, captchaImage: captcha.data };
  } catch (error) {
    console.error('验证码生成失败:', error);
    throw new Error('验证码生成失败，请重试');
  }
};

/**
 * 验证图形验证码
 * @param params 验证参数 { key, code }
 * @param preserve 是否在验证成功后保留验证码（发送邮件等二次验证场景使用）
 * @returns 验证是否通过
 */
export const verifyCaptcha = async ({ key, code }: VerifyCaptchaParams, preserve = false): Promise<boolean> => {
  if (!key || !code) return false;

  try {
    const fullKey = `${CAPTCHA_CONFIG.keyPrefix}${key}`;
    const storedCode = await redisClient.get(fullKey);

    console.log('\n--- 验证码校验 Debug ---');
    console.log('前端传来的 key:', key);
    console.log('前端传来的 code:', code);
    console.log('Redis中存的 fullKey:', fullKey);
    console.log('Redis中存的 storedCode:', storedCode);
    console.log('--------------------------\n');

    if (!storedCode) {
      console.log('验证码不存在或已过期:', key);
      return false;
    }

    const userInput = code.trim().toLowerCase();
    const isValid = storedCode === userInput;

    // 如果验证通过，并且未要求保留，才删除验证码
    if (isValid && !preserve) {
      await redisClient.del(fullKey);
    } else if (!isValid) {
      // 验证失败的话，立即删除验证码，防止爆破尝试
      await redisClient.del(fullKey);
    }

    return isValid;
  } catch (error) {
    console.error('验证码校验失败:', error);
    return false;
  }
};

/**
 * 删除验证码
 * @param key 验证码 key
 */
export const deleteCaptcha = async (key: string): Promise<void> => {
  const fullKey = `${CAPTCHA_CONFIG.keyPrefix}${key}`;
  await redisClient.del(fullKey);
};

/**
 * 检查验证码是否存在
 * @param key 验证码 key
 */
export const hasCaptcha = async (key: string): Promise<boolean> => {
  const fullKey = `${CAPTCHA_CONFIG.keyPrefix}${key}`;
  const exists = await redisClient.exists(fullKey);
  return exists === 1;
};
