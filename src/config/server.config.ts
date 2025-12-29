/** ---------- 类型定义 ---------- */
interface ServerConfig {
  port: number
  host: string
  serverUrl: string
  frontendUrl: string
  signKey: string
}

/** ---------- 配置项 ---------- */
const config: ServerConfig = {
  port: Number(process.env.PORT) || 3000,
  host:
    process.env.HOST ||
    'localhost',
  serverUrl:
    process.env.SERVER_URL ||
    `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`,
  frontendUrl:
    process.env.FRONTEND_URL ||
    'http://localhost:5173',
  signKey:
    process.env.SIGN_SECRET ||
    'default-secret',
}

export default Object.freeze(config)
