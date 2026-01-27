/** ---------- 类型定义 ---------- */
export interface SaltConfig {
  /** 文章盐值 */
  article: string;
  /** 用户盐值 */
  user: string;
}


/** ---------- 配置项 ---------- */
const config: SaltConfig = {
  article: process.env.ARTICLE_SALT || 'article',
  user: process.env.USER_SALT || 'user'
};

export default config;