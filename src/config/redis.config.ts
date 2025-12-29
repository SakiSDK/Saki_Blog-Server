/** ---------- Redis配置项类型定义 ---------- */
export interface RedisConfig {
  host: string
  port: number
  password: string
  db: number
  prefix: string
}

/** ---------- Redis配置项 ---------- */
const config: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: Number(process.env.REDIS_DB) || 0,
  prefix: process.env.REDIS_KEY_PREFIX || 'blog-verify-code:',
}

export default Object.freeze(config);
