/** ---------- MeiliSearch 配置项类型定义 ---------- */
export type MeiliSearchConfig = {
  /** MeiliSearch 主机名 */
  host: string;
  /** MeiliSearch API 密钥 */
  apiKey: string;
};

/** ---------- MeiliSearch 配置项 ---------- */
export const config: MeiliSearchConfig = {
  host: process.env.MEILISEARCH_HOST || '',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
}

export default Object.freeze(config)
