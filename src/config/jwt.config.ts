/** ---------- JWT配置项类型定义 ---------- */
export type JWTConfig = {
  /** access token 密钥 */
  accessSecret: string;
  /** refresh token 密钥 */
  refreshSecret: string;
  /** access token 过期时间（秒） */
  accessExpiresIn: number;
  /** refresh token 过期时间（秒） */
  refreshExpiresIn: number;
  /** JWT 签发者 */
  issuer: string;
};


/** ---------- JWT配置项 ---------- */
export const config: JWTConfig = {
  accessSecret: process.env.JWT_ACCESSTOKENSECRET || 'default-secret',
  refreshSecret: process.env.JWT_REFRESHTOKENSECRET || 'default-secret',
  accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '7d', 10),
  refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '30d', 10),
  issuer: process.env.JWT_ISSUER || 'blog-api',
}

export default Object.freeze(config);