import { Redis } from 'ioredis'
import crypto from 'crypto'
import { BadRequestError } from './errors'


/** ---------- 限流规则类型 ---------- */
export interface RateLimitRule {
  dimension: string;  // 限流维度(ip/email/device/userId)
  expire: number;   // 限流时间(秒)
  maxCount: number;   // 最大请求次数
}


/**
 * 限流工具类
 * @description: 封装限流工具类，提供对请求进行限流处理的功能
*/
export class RateLimiter {
  private redisClient: Redis; // Redis客户端
  private scene: string;    // 限流场景
  private rules: RateLimitRule[] = [];

  /**
   * 构造函数
   * @description: 创建限流工具类实例
  */
  constructor(redisClient: Redis, scene: string) {
    this.redisClient = redisClient;
    this.scene = scene;
  }

  /**
   * @description: 添加限流规则（链式调用）
  */
  addRule(rule: RateLimitRule): RateLimiter {
    const exists = this.rules.some(item => item.dimension === rule.dimension);
    if (!exists) {
      this.rules.push(rule);
    }
    return this;
  }

  /**
   * @description: 生成Redis Key
  */
  private generateKey(dimension: string, identifier: string | number): string {
    return `limit:${this.scene}:${dimension}:${identifier}`
  }

  /**
   * 检查方法：检查限流 + 更新次数
   * @params identifiers 限流标识符（如 { ip: '192.168.1.1', email: 'test@xxx.com' }）
  */
  async checkAndIncr(identifiers: Record<string, string | number>): Promise<void> {
    // 1. 校验规则和标识是否匹配（和之前一致）
    this.rules.forEach(rule => {
      if (!identifiers[rule.dimension]) {
        throw new Error(`限流规则缺少维度标识：${rule.dimension}`);
      }
    });

    // -------------------------- 关键修改：ioredis Pipeline 用法 --------------------------
    // 2. 批量检查所有规则的当前计数（ioredis 管道：先创建，再添加命令）
    const checkPipeline = this.redisClient.pipeline();
    this.rules.forEach(rule => {
      const key = this.generateKey(rule.dimension, identifiers[rule.dimension]);
      checkPipeline.get(key); // 批量添加 get 命令
    });
    // ioredis Pipeline.exec() 返回 Promise<[Error | null, string | null][]>
    const checkResults = await checkPipeline.exec();

    // 3. 检查是否触发限流（处理 ioredis 管道结果：每个元素是 [err, value]）
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      const result = checkResults?.[i];
      if (!result || !(result instanceof Array) || result.length < 2) {
        throw new Error('Redis 返回结果格式异常');
      }

      const [err, countStr] = checkResults[i] || [null, null];

      if (err) throw new Error(`Redis 限流检查失败：${err.message}`);

      const count = countStr ? parseInt(String(countStr), 10) : 0;
      if (count >= rule.maxCount) {
        const dimensionDesc = this.getDimensionDesc(rule.dimension);
        throw new BadRequestError(
          `${dimensionDesc} ${rule.expire}秒内最多可操作${rule.maxCount}次，请稍后重试`
        );
      }
    }

    // 4. 批量更新计数（自增 + 首次设置过期时间）
    const incrPipeline = this.redisClient.pipeline();
    for (const rule of this.rules) {
      const key = this.generateKey(rule.dimension, identifiers[rule.dimension]);
      const [err, currentCount] = await this.redisClient.get(key).then(res => [null, res], err => [err, null]);

      if (err) throw new Error(`Redis 计数查询失败：${err.message}`);

      incrPipeline.incr(key); // 计数自增 1
      if (!currentCount) { // 首次设置时添加过期时间
        incrPipeline.expire(key, rule.expire);
      }
    }
    await incrPipeline.exec(); // 执行批量更新
  }
  /**
   * 辅助：维度标识转友好描述（和之前一致）
   */
  private getDimensionDesc(dimension: string): string {
    const descMap = {
      ip: '同一IP',
      email: '同一邮箱',
      deviceId: '同一设备',
      userId: '同一账号',
      phone: '同一手机号',
      ipWithMail: '同一IP和邮箱',
    };
    return descMap[dimension as keyof typeof descMap] || `同一${dimension}`;
  }

  /**
   * 手动清除某个维度的限流（和之前一致）
   */
  async clear(dimension: string, identifier: string | number): Promise<void> {
    const key = this.generateKey(dimension, identifier);
    await this.redisClient.del(key);
  }

  /**
   * 获取当前限流计数（和之前一致）
   */
  async getCurrentCount(dimension: string, identifier: string | number): Promise<number> {
    const key = this.generateKey(dimension, identifier);
    const countStr = await this.redisClient.get(key);
    return countStr ? parseInt(countStr) : 0;
  }
}

/**
 * 生成设备唯一标识（IP + User-Agent 哈希，和之前一致）
 */
export const generateDeviceId = (ip: string, userAgent: string): string => {
  return crypto.createHash('md5')
    .update(`${ip}_${userAgent || 'unknown'}`)
    .digest('hex');
};