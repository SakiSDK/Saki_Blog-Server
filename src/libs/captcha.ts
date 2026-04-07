import svgCaptcha, { CaptchaObj } from 'svg-captcha';
import { redisClient } from './redis';
import crypto from 'crypto';


/** ---------- 类型定义 ---------- */
export interface CreateCaptchaResult {
  /** 验证码唯一标识 */
  key: string;
  /** SVG 图片字符串 */
  svg: string;
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
  /** 数学运算符 */
  mathOperator: '+',
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
        width: 120,
        height: 40,
        background: CAPTCHA_CONFIG.background,
        ignoreChars: '0O1l6b8B9q',
      });
    } else {
      // 数学运算验证码
      captcha = svgCaptcha.createMathExpr({
        noise: CAPTCHA_CONFIG.noise,
        color: CAPTCHA_CONFIG.color,
        background: CAPTCHA_CONFIG.background,
        width: 120,
        height: 40,
        mathMin: 1,
        mathMax: 20,
        mathOperator: CAPTCHA_CONFIG.mathOperator,
      });
    }

    // 处理验证码结果
    const processedCode = CAPTCHA_CONFIG.type === 'math'
      ? captcha.text.toLowerCase()  // math 模式下 text 是计算结果
      : filterConfusableChars(captcha.text).toLowerCase();

    // 生成 key 并存储到 Redis
    const key = generateCaptchaKey();
    const shortKey = key.replace(CAPTCHA_CONFIG.keyPrefix, '');  // 返回给前端的是短 key

    await redisClient.set(key, processedCode, 'EX', CAPTCHA_CONFIG.expireSeconds);

    return { key: shortKey, svg: captcha.data };
  } catch (error) {
    console.error('验证码生成失败:', error);
    throw new Error('验证码生成失败，请重试');
  }
};

/**
 * 验证图形验证码
 * @param params 验证参数 { key, code }
 * @returns 验证是否通过
 */
export const verifyCaptcha = async ({ key, code }: VerifyCaptchaParams): Promise<boolean> => {
  if (!key || !code) return false;

  try {
    const fullKey = `${CAPTCHA_CONFIG.keyPrefix}${key}`;
    const storedCode = await redisClient.get(fullKey);

    if (!storedCode) {
      console.log('验证码不存在或已过期:', key);
      return false;
    }

    const userInput = code.trim().toLowerCase();
    const isValid = storedCode === userInput;

    // 验证后删除验证码（一次性使用）
    await redisClient.del(fullKey);

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
