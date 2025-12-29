/** ---------- Google 配置项类型定义 ---------- */
export type GoogleConfig = {
  /** Google 客户端 ID */
  clientId: string;
  /** Google 客户端密钥 */
  clientSecret: string;
  /** Google 重定向 URI */
  redirectUri: string;
};

/** ---------- Google 配置项 ---------- */
export const config: GoogleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
}

export default Object.freeze(config);
