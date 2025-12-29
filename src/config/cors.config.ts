/** ---------- 跨域请求配置项类型定义 ---------- */
export type CORSConfig = {
  /** 允许的请求来源 */
  origin: string[];
  /** 允许的请求方法 */
  methods: string[];
  /** 是否允许携带认证信息 */
  credentials: boolean;
};

/** ---------- 跨域请求配置项 ---------- */
export const config: CORSConfig = {
  origin:
    (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',') // ← 把字符串分割为数组
    .map(o => o.trim()),
  methods:
    (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE')
    .split(',')
    .map(m => m.trim()),
  credentials: process.env.CORS_CREDENTIALS === 'true',
}

export default Object.freeze(config);