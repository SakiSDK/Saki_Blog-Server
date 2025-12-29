import './env-loader'
import path from 'path'
import serverConfig from './server.config'
import databaseConfig from './database.config'
import redisConfig from './redis.config'
import jwtConfig from './jwt.config'
import amapConfig from './amap.config'
import corsConfig from './cors.config'


export const config = {
    ...serverConfig,
    /** 数据库配置 */
    database: databaseConfig,
    /** redis配置 */
    redis: redisConfig,
    /** JWT登录验证配置 */
    jwt: jwtConfig,
    /** 高德地图配置 */
    amap: amapConfig,
    /** ---------- 上传配置 ---------- */
    upload: {
        path: path.resolve(process.env.UPLOAD_PATH || './uploads'), // 绝对路径
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 默认10MB
        maxImageCount: parseInt(process.env.MAX_IMAGE_COUNT || '10', 10),
        allowedImageTypes: (
            process.env.ALLOWED_IMAGE_TYPES
            || 'image/jpeg,image/png,image/gif,imge/webp,image/svg+xml'
        ).split(','),
        allowedArticleTypes: (
            process.env.ALLOWED_ARTICLE_TYPES
            || 'article/markdown'
        ).split(','),
    },

    logger: {
        level: (process.env.LOG_LEVEL || 'debug') as 'debug' | 'info' | 'warn' | 'error',
        dir: path.resolve(process.env.LOG_DIR || './logs'),
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
    },

    /** ---------- 跨域请求配置 ---------- */
    cors: {
        origin:  (process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',') // ← 把字符串分割为数组
        .map(o => o.trim()),
        methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: process.env.CORS_CREDENTIALS === 'true',
    },

    /** ---------- OSS对象存储配置 ---------- */
    oss: {
        accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
        bucket: process.env.OSS_BUCKET || '',
        region: process.env.OSS_REGION || '',
        endpoint: process.env.OSS_ENDPOINT || '',
        baseUrl: process.env.OSS_BASE_URL || '',
        enable: process.env.OSS_ENABLE === 'true',
    },

    /** ---------- meilisearch搜索引擎配置 ---------- */
    meilisearch: {
        host: process.env.MEILISEARCH_HOST || '',
        apiKey: process.env.MEILISEARCH_API_KEY || '',
    }, 
    
    /** ---------- 谷歌账号登录验证配置 ---------- */
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    },

    /** ---------- GIthub账号登录验证配置 ---------- */
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    },

    /** ---------- 邮箱登录验证配置 ---------- */
    email: {
        host: process.env.EMAIL_HOST || 'smtp.qq.com',
        port: process.env.EMAIL_PORT || 465,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        from: process.env.EMAIL_FROM,
    },
    env: process.env.NODE_ENV || 'development',
}