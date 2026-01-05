/** ---------- 类型定义 ---------- */
export type SessionConfig = {
  /** 会话过期时间 */
  ttl: number;
  /** 会话名称 */
  name: string;
  /** 会话密钥 */
  secret: string;
  /** 会话存储：会话存储方式 */
  store: string;
  /** 是否使用Cookie */
  useCookie: boolean;
  /** Cookie配置 */
  cookie: {
    /** 防止CSRF */
    sameSite: 'lax' | 'strict' | 'none' | false;
    /** 有效期 */
    maxAge: number;
    /** 是否仅允许 HTTPS */
    secure: boolean;
    /** 是否仅允许 HTTP，防止XSS攻击 */
    httpOnly: boolean;
  };
};


/** ---------- 配置项 ---------- */
export const sessionConfig: SessionConfig = {
  ttl: parseInt(process.env.SESSION_TTL || '3600', 10), // 1小时
  name: process.env.SESSION_NAME || 'session',
  secret: process.env.SESSION_SECRET || 'your-secret',
  store: 'redis',
  useCookie: true,
  cookie: {
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60, // 1小时
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

export default sessionConfig;