/** ---------- 数据库配置项类型定义 ---------- */
export type DatabaseConfig = {
  /** 数据库主机名 */
  host: string;
  /** 数据库端口号 */
  port: number;
  /** 数据库用户名 */
  user: string;
  /** 数据库密码 */
  password: string;
  /** 数据库名称 */
  name: string;
  /** 数据库方言 */
  dialect: string;
};

/** ---------- 数据库配置项 ---------- */
export const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  name: process.env.DB_NAME || 'my_blog',
  dialect: process.env.DB_DIALECT || 'mysql',
}

export default Object.freeze(config);
