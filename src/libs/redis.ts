import Redis from 'ioredis';
import { config } from '@/config';
import { Store, SessionData } from 'express-session';


/** ---------- 类型定义 ---------- */
/** redis实例 */
export const redisClient = new Redis({
  host: config.redis.host,
  port: +config.redis.port,
  password: config.redis.password,
  db: +config.redis.db,
  keyPrefix: config.redis.prefix,
  connectTimeout: 5000,
  retryStrategy: (times) => {
    if (times > 3) throw new Error('Redis 连接重试超过 3 次')
    return times * 1000;
  }
})


/** ---------- 测试Redis链接 ---------- */
redisClient.on('connect', () => { console.log('✅ Redis 连接成功') })
redisClient.on('error', (err) => { console.error('Redis error:', err) })


/** ---------- 自定义SessionStore ---------- */
export class RedisSessionStore extends Store { 
  private client: Redis;
  private keyPrefix: string;
  private ttl: number;

  constructor() {
    super();
    this.client = redisClient;
    this.keyPrefix = config.redis.prefix;
    this.ttl = config.session.ttl ||  3600;
  }

  set(
    sid: string,
    session: SessionData,
    callback: (err?: Error | null) => void
  ): void {
    const key = this.keyPrefix + sid;
    //? 后期可能会加日志
    // 安全许序列化（处理cookie可能会undefined的情况）
    const sessionStr = JSON.stringify({
      ...session,
      cookie: session.cookie ? { ...session.cookie } : {}
    })
    this.client.set(key, JSON.stringify(session), 'EX', this.ttl, (err) => {
      if (err) {
        console.error('Redis set error:', err);
        return callback(err);
      } else {
        callback(null);
      }
    });
  }
  get(
    sid: string,
    callback: (
      err?: Error | null,
      session?: SessionData | null
    ) => void
  ): void {
    const key = this.keyPrefix + sid;
    this.client.get(key, (err, data) => {
      if (err) {
        console.error('Redis get error:', err);
        return callback(err);
      }
      if (!data) {
        console.log('Redis get no data:', key);
        return callback(null, null);
      }
      try {
        const parsedSession = JSON.parse(data) as SessionData
        callback(null, parsedSession);
      } catch (parseErr) {
        console.error('Redis get parse error:', parseErr);
        callback(parseErr as Error);
      }
    })
  }
  destroy(sid: string, callback: (err?: Error | null) => void): void {
    const key = this.keyPrefix + sid
    console.log(`删除 Session: ${key}`)
    this.client.del(key, callback)
  }
  touch(sid: string, _session: SessionData, callback: (err?: Error | null) => void): void {
    const key = this.keyPrefix + sid
    this.client.expire(key, this.ttl, (err) => {
      if (err) console.error(`Session touch 失败: ${key}`, err)
      callback(err)
    })
  }
}