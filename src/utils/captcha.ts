import svgCaptcha, { CaptchaObj } from 'svg-captcha';
import crypto from 'crypto'
import { NotFoundError } from './errors';


/** ---------- 类型定义 ---------- */
interface CaptchaItem {
  code: string;     // 验证码文本
  expiresAt: number;  // 验证码有效期
}

export interface CreateCaptchaResult {
  key: string;  // 验证码唯一 key
  svg: string;  // SVG 图片字符串
}

export interface VerifyCaptchaParams {
  key: string;  // 验证码唯一 key
  code: string;   // 验证码文本
}

/**
 * 存储抽象接口（解耦存储逻辑）
 */
interface CaptchaStorage {
  get(key: string): CaptchaItem | undefined;
  set(key: string, item: CaptchaItem): void;
  delete(key: string): void;
  cleanExpired(): void;
}


/**
 * Map存储实现
*/
class MapStorage implements CaptchaStorage {
  private store = new Map<string, CaptchaItem>();

  get(key: string): CaptchaItem | undefined {
    return this.store.get(key);
  }

  set(key: string, item: CaptchaItem): void {
    this.store.set(key, item);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) this.store.delete(key);
    }
  }
}


/** ---------- 验证码配置中心（统一配置管理） ---------- */
export const CAPTCHA_CONFIG = {
  // 验证码类型：char(字符验证码) or math(数学验证码)
  TYPE: 'math' as 'char' | 'math',
  LENGTH: 4,        // 验证码长度
  NOISE: 3,         // 验证码干扰线数量
  BACKGROUND: '#f5f7fa',// 验证码背景颜色
  COLOR: true,      // 是否使用彩色字符
  IGNORE_CONFUSABLE: true,// 是否忽略大小写
  MATHOPERATOR: '+',


  // 时效配置
  EXPIRE_MS: 5 * 60 * 1000,     // 验证码有效期 5 分钟
  CLEAN_INTERVAL_MS: 10 * 60 * 1000,// 清理间隔

  // 存储配置
  //? 后续切换成Redis
  STORAGE_TYPE: 'map' as const, // 存储类型：map(内存) or redis(Redis)

}


/**
 * 初始化存储实例
*/
const getStorage = (): CaptchaStorage => {
  switch (CAPTCHA_CONFIG.STORAGE_TYPE) {
    case 'map':
      return new MapStorage();
    default:
      throw new Error(`不支持的存储类型：${CAPTCHA_CONFIG.STORAGE_TYPE}`);
  }
}


const captchaStorage = getStorage();


/** ---------- 生成唯一验证码Key（安全不重复） ---------- */
const generateCaptchaKey = () => {
  return `captcha_$${crypto.randomUUID().replace(/-/g, '')}`
}


/**
 * 过滤易混淆字符
 */
const filterConfusableChars = (text: string): string => {
  if (!CAPTCHA_CONFIG.IGNORE_CONFUSABLE) return text;
  const confusableChars = /[0O1l6b8B9q]/g;
  const validChars = '23457acdefghijkmnpqrstuvwxyz';
  return text.replace(confusableChars, () =>
    validChars[Math.floor(Math.random() * validChars.length)]
  );
};


/**
 * 生成验证码（支持字符/数学公式）
 */
export const createCaptcha = (): CreateCaptchaResult => {
  try {
    let captcha: CaptchaObj;
    if (CAPTCHA_CONFIG.TYPE === 'char') {
      captcha = svgCaptcha.create({
        noise: CAPTCHA_CONFIG.NOISE,
        color: CAPTCHA_CONFIG.COLOR,
        size: CAPTCHA_CONFIG.LENGTH,
        width: 120,
        height: 40,
        background: CAPTCHA_CONFIG.BACKGROUND,
        ignoreChars: '0O1l6b8B9q',
      })
    } else {
      captcha = svgCaptcha.createMathExpr({
        noise: CAPTCHA_CONFIG.NOISE,
        color: CAPTCHA_CONFIG.COLOR,
        size: CAPTCHA_CONFIG.LENGTH,
        background: CAPTCHA_CONFIG.BACKGROUND,
        width: 120,
        height: 40,
        mathMin: 1, // 计算数最小值
        mathMax: 20, // 计算数最大值
        mathOperator: CAPTCHA_CONFIG.MATHOPERATOR, // 运算符（支持 +-*/，可写为 ['+', '-'] 随机切换）
      })
    }

    // 处理验证码结果（字符：过滤+转小写； 数字：直接取答案）
    const processedCode = CAPTCHA_CONFIG.TYPE === 'math'
      ? captcha.text.toLowerCase() // math模式下，captcha.text 是计算结果（如 "8"）
      : filterConfusableChars(captcha.text).toLowerCase();

    const key = generateCaptchaKey();
    captchaStorage.set(key, {
      code: processedCode,
      expiresAt: Date.now() + CAPTCHA_CONFIG.EXPIRE_MS,
    });

    return { key, svg: captcha.data }
  } catch (error) {
    throw new Error('验证码生成失败，请重试');
  }
}


export const verifyCaptcha = ({ key, code }: VerifyCaptchaParams): boolean => {
  console.log('验证码验证', key, code)
  if (!key || !code) return false;

  try {
    const captchaItem = captchaStorage.get(key);
    if (!captchaItem) return false;

    if (Date.now() > captchaItem.expiresAt) {
      captchaStorage.delete(key);
      return false;
    }

    const userInput = code.trim().toLowerCase();
    const isValid = captchaItem.code === userInput;
    if (isValid) {
      captchaStorage.delete(key);
    }

    return isValid;
  } catch (error) {
    console.error(error);
    return false;
  }
}


/**
 * 定期清理过期验证码
 */
const initExpiredCleaner = () => {
  captchaStorage.cleanExpired();
  setInterval(() => captchaStorage.cleanExpired(), CAPTCHA_CONFIG.CLEAN_INTERVAL_MS);
};

initExpiredCleaner();






















// // 内存存储验证码星系（生产环境推荐使用Redis）
// //? 之后改成Redis
// const store = new Map();

// // 验证码有效期（5分钟）
// const EXPIRE_MS = 5 * 60 * 1000;


// /**
//  * ✅ 生成验证码
//  * - 使用 svg-captcha 生成 SVG 图片与对应的验证码文本
//  * - 存入内存 Map 中，并附带过期时间
//  * - 返回给前端：验证码唯一 key 和 svg 图片字符串
//  */
// // export const createCaptcha = () => {
// //   // 创建验证码对象
// //   const captcha = svgCaptcha.create({
// //     size: 4,      // 验证码长度
// //     noise: 2,       // 验证码干扰线数量
// //     color: true,    // 是否使用彩色字符
// //     background: '#eee'// 验证码背景颜色
// //   })

// //   // 生成唯一 key，用于区分不同验证码
// //   const key = Date.now().toString() + Math.random().toString(36).slice(2, 6);

// //   // 存储验证码内容及过期时间
// //   store.set(key, {
// //     code: captcha.text.toLowerCase(),   // 转换为小写避免大小写敏感问题
// //     expiresAt: Date.now() + EXPIRE_MS,   // 过期时间
// //   })

// //   // 返回验证码唯一 key 和 svg 数据
// //   return {
// //     key,
// //     svg: captcha.data
// //   }
// // }

// /**
//  * ✅ 验证验证码
//  * - 根据前端传入的 key 找到对应验证码
//  * - 检查是否存在 / 是否过期 / 是否匹配
//  * - 校验成功后删除该条验证码记录
//  */
// export const verifyCaptcha = (key: string, code: string) => {
//   const item = store.get(key);
//   if (!item) return false; // 验证码不存在

//   // 检查是否过期
//   if (Date.now() > item.expiresAt) {
//     store.delete(key);
//     return false;
//   }

//   // 检查验证码是否正确（忽略大小写）
//   const isValid = item.code === code.toLowerCase();

//   // 验证成功则删除验证码，避免重复使用
//   if (isValid) store.delete(key);

//   return isValid;
// }


// /**
//  * ✅ 定期清理过期验证码
//  * - 每 10 分钟清理一次
//  * - 防止内存中验证码无限增长
//  */
// setInterval(() => {
//   const now = Date.now();
//   for (const [key, item] of store.entries()) {
//     if (now > item.expiresAt) store.delete(key);
//   }
// }, 10 * 60 * 1000);