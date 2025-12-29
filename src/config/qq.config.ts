/** ---------- QQ登录配置项类型定义 ---------- */
export type QQConfig = {
  /** QQ登录回调地址 */
  callbackUrl: string;
  /** QQ登录APPID */
  appId: string;
  /** QQ登录APPKEY */
  appKey: string;
};

/** ---------- QQ登录配置项 ---------- */
export const config: QQConfig = {
  callbackUrl: process.env.QQ_CALLBACK_URL || '',
  appId: process.env.QQ_APP_ID || '',
  appKey: process.env.QQ_APP_KEY || '',
}

export default Object.freeze(config);
