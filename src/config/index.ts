import './env-loader'
import path from 'path'
import serverConfig from './server.config'
import databaseConfig from './database.config'
import redisConfig from './redis.config'
import jwtConfig from './jwt.config'
import amapConfig from './amap.config'
import corsConfig from './cors.config'
import githubConfig from './github.config'
import googleConfig from './google.config'
import meilisearchConfig from './meilisearch.config'
import ossConfig from './oss.config'
import emailConfig from './email.config'
import uploadConfig from './upload.config'
import sessionConfig from './session.config'


export const config = {
    ...serverConfig,
    /** 数据库配置 */
    database: databaseConfig,
    /** 会话配置 */
    session: sessionConfig,
    /** redis配置 */
    redis: redisConfig,
    /** JWT登录验证配置 */
    jwt: jwtConfig,
    /** 高德地图配置 */
    amap: amapConfig,
    /** 文件上传配置 */
    upload: uploadConfig,
    logger: {
        level: (process.env.LOG_LEVEL || 'debug') as 'debug' | 'info' | 'warn' | 'error',
        dir: path.resolve(process.env.LOG_DIR || './logs'),
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
    },
    /** 跨域请求配置 */
    cors: corsConfig,
    /** OSS对象存储配置 */
    oss: ossConfig,
    /** meilisearch搜索引擎配置 */
    meilisearch: meilisearchConfig, 
    /** GitHub登录验证配置 */
    github: githubConfig,
    /** 谷歌账号登录验证配置 */
    google: googleConfig,
    /** 邮箱登录验证配置 */
    email: emailConfig,
    env: process.env.NODE_ENV || 'development',
}