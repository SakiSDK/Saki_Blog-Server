import Redis from 'ioredis'
import { config } from '../config'
import { Store, SessionData } from 'express-session';


/** ---------- redis实例 ---------- */
export const redisClient = new Redis({
    host: config.redis.host,            // Redis服务器地址
    port: +config.redis.port,           // Redis服务器端口
    password: config.redis.password,    // Redis服务器密码
    db: +config.redis.db,               // Redis数据库编号
    keyPrefix: config.redis.prefix,     // Redis键前缀，方便区分
    // 可选：添加连接超时和重试配置
    connectTimeout: 5000,
    retryStrategy: (times) => {
        if (times > 3) throw new Error('Redis 连接重试超过 3 次')
        return times * 1000
    }
})


// 测试Redis连接
redisClient.on('connect', () => { console.log('✅ Redis 连接成功') })
redisClient.on('error', (err) => { console.error('Redis error:', err) })


/** ---------- 修复后的极简 Session Store（只保留必需逻辑，杜绝冗余错误） ---------- */
/** ---------- 修复后的 Session Store ---------- */
export class RedisSessionStore extends Store {
    private client: Redis;
    private keyPrefix: string;
    private ttl: number;

    constructor(ttl = 3600) {
        super(); // 调用父类构造函数
        this.client = redisClient;
        this.keyPrefix = 'sess:';
        this.ttl = ttl;
    }

    set(sid: string, session: SessionData, callback: (err?: Error | null) => void): void {
        const key = this.keyPrefix + sid;
        // 👇 加日志：验证存储时是否有 googleAuthState（关键！）
        console.log('📥 存储 Session - sid:', sid, '数据:', {
            googleAuthState: session.googleAuthState,
            cookie: session.cookie
        });
        // 序列化时确保所有字段都被保存（包括自定义的 googleAuthState）
        const sessionStr = JSON.stringify({
            ...session, // 展开所有 session 字段（包括自定义的）
            cookie: { ...session.cookie } // 确保 cookie 字段也被序列化
        });
        this.client.set(key, sessionStr, 'EX', this.ttl, (err) => {
            if (err) {
                console.error('❌ Session 存储失败:', err);
                return callback(err);
            }
            console.log('✅ Session 存储成功 - key:', key);
            callback(null);
        });
    }

    get(sid: string, callback: (err?: Error | null, session?: SessionData | null) => void): void {
        const key = this.keyPrefix + sid;
        console.log('📤 获取 Session - sid:', sid, 'key:', key);
        this.client.get(key, (err, data) => {
            if (err) {
                console.error('❌ Session 获取失败:', err);
                return callback(err);
            }
            if (!data) {
                console.warn('⚠️  未找到 Session - key:', key);
                return callback(null, null);
            }
            try {
                const parsedSession = JSON.parse(data) as SessionData;
                // 👇 加日志：验证读取到的 session 是否有 googleAuthState
                console.log('✅ Session 读取成功 - 数据:', {
                    googleAuthState: parsedSession.googleAuthState,
                    cookie: parsedSession.cookie
                });
                callback(null, parsedSession);
            } catch (parseErr: any) {
                console.error('❌ Session 反序列化失败:', parseErr);
                callback(parseErr);
            }
        });
    }

    // destroy 和 touch 方法不变，保留！
    destroy(sid: string, callback: (err?: Error | null) => void): void {
        const key = this.keyPrefix + sid;
        console.log('🗑️ 删除 Session - key:', key);
        this.client.del(key, callback);
    }

    touch(sid: string, _session: SessionData, callback: (err?: Error | null) => void): void {
        const key = this.keyPrefix + sid;
        this.client.expire(key, this.ttl, callback);
    }
} 