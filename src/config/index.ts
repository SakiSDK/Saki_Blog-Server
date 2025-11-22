import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development' //获取当前是不是开发环境
dotenv.configDotenv({
    path: `.env.${env}`
})

export const config = {
    /** ---------- 当前开发环境 ---------- */
    env: process.env.NODE_ENV || 'development',
    
    /** ---------- 服务器配置 ---------- */
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    serverUrl: process.env.SERVER_URL,
    signSecret: process.env.SIGN_SECRET || 'default-secret',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    /** ---------- 数据库配置 ---------- */
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '200444ww..',
        name: process.env.DB_NAME || 'my_blog',
        dialect: process.env.DB_DIALECT || 'mysql',
    },

    /** ---------- redis配置 ---------- */
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
        db: process.env.REDIS_DB || 0,
        prefix: process.env.REDIS_KEY_PREFIX || 'verify_code:',
    },

    /** ---------- JWT登录验证配置 ---------- */
    jwt: {
        accessTokenSecret: process.env.JWT_ACCESSTOKENSECRET || 'default-secret',
        refreshTokenSecret: process.env.JWT_REFRESHTOKENSECRET || 'default-secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: process.env.JWT_ISSUER || 'SDK',
    },

    /** ---------- 高德地图配置 ---------- */
    amap: {
        apiKey: process.env.AMAP_API_KEY || '',
        baseUrl: process.env.AMAP_BASE_URL || 'https://restapi.amap.com/v3',
    },

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
    }
}