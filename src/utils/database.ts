import mysql from 'mysql2/promise'
import { config } from '../config'
import { logger } from './logger'

class MySQLDatabase {
  private pool: mysql.Pool
  constructor() {
    this.pool = mysql.createPool({
      host: config.database.host || 'localhost',
      port: config.database.port ? config.database.port : 3306,
      user: config.database.user || 'root',
      password: config.database.password || '200444ww..',
      database: config.database.name || 'my_blog',
      connectionLimit: 10,
      connectTimeout: 60000,
    });
    this.initialize();
  }
  
  //初始化
  private async initialize(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      logger.info('✅ MySQL数据库连接成功');
      connection.release();
    } catch (error) {
      logger.error('❌ MySQL数据库连接失败', error);
      throw error;
    }
  }

  //获取链接
  public async getConnetion(): Promise<mysql.PoolConnection> {
    return await this.pool.getConnection();
  }

  // 执行查询---->主要用于查询数据
  public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    try {
      const [rows] = await this.pool.execute(sql, params);
      const duration = Date.now() - start;
      
      logger.debug('数据库查询', {
        sql,
        params,
        duration: `${duration}ms`,
        rows: (rows as any).length
      });

      return rows as T[];
    } catch (error) {
      logger.error('数据库查询错误', error, { sql, params });
      throw error;
    }
  }

  // 执行更新/插入/删除
  public async execute(sql: string, params?: any[]): Promise<mysql.OkPacketParams> {
    const start = Date.now();
    try {
      const [result] = await this.pool.execute(sql, params);
      const duration = Date.now() - start;
      
      logger.debug('数据库操作', {
        sql,
        params,
        duration: `${duration}ms`,
        affectedRows: (result as mysql.OkPacket).affectedRows
      });

      return result as mysql.OkPacketParams;
    } catch (error) {
      logger.error('数据库操作错误', error, { sql, params });
      throw error;
    }
  }
  // 事务处理----> 保证数据一致性
  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      
      logger.debug('事务提交成功');
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('事务回滚', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 关闭连接池
  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('MySQL连接池已关闭');
  }
}

export const db = new MySQLDatabase();

//类型导出
export type { mysql };