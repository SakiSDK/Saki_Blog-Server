/** ---------- DeepSeek配置项类型定义 ---------- */
export type DeepSeekConfig = {
  /** DeepSeek API 密钥 */
  apiKey: string;
  /** DeepSeek API 服务地址 */
  apiUrl: string;
  /** 是否启用摘要生成功能 */
  enabled: boolean;
};


/** ---------- DeepSeek配置项 ---------- */
export const config: DeepSeekConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
  enabled: process.env.DEEPSEEK_ENABLED === 'true',
}

export default config;