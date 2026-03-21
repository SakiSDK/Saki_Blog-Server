import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config';
import path from 'path';

// 定义日志级别类型
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 定义日志级别优先级
const levels: {[key in LogLevel]: number} = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

//根据环境配置日志级别
const getLevel = (): LogLevel => {
  const env = config.env;
  const configLevel = config.logger.level;
  if (configLevel && levels[configLevel] !== undefined) {
    return configLevel;
  }
  return env === 'development' ? 'debug' : 'info';
};  

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // 在生产环境中，隐藏敏感信息
    if (config.env === 'production') {
      if (info.message && typeof info.message === 'string') {
        // 简单的敏感信息过滤（可根据需要扩展）
        info.message = info.message
        .replace(/(password|secret|token|key)=[^&]*/gi, '$1=***')
        .replace(/("password"|"secret"|"token"|"key"):\s*"[^"]*"/gi, '$1:"***"');
      }
    }
    return info;
  })(),
  winston.format.json()
);

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
)

// 创建 transports 数组
const transports: winston.transport[] = [
  // 控制台输出（仅在开发环境使用彩色输出）
  new winston.transports.Console({
    format: config.env === 'production' ? format : consoleFormat,
    level: getLevel(),
  }),
];

// 添加文件输出（如果不是测试环境）
if (config.env !== 'test') {
  // 每日轮转文件传输
  const dailyRotateTransport = new DailyRotateFile({
    filename: path.join(config.logger.dir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.logger.maxSize,
    maxFiles: config.logger.maxFiles.toString(),
    level: getLevel(),
    format: format,
  });

  // 错误日志单独文件
  const errorFileTransport = new winston.transports.File({
    filename: path.join(config.logger.dir, 'error.log'),
    level: 'error',
    format: format,
  });

  transports.push(dailyRotateTransport, errorFileTransport);
}

// 创建 logger 实例
export const logger = winston.createLogger({
  level: getLevel(),
  levels,
  format,
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(config.logger.dir, 'exceptions.log') 
    }),
  ],
  // 处理未处理的 promise 拒绝
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(config.logger.dir, 'rejections.log') 
    }),
  ],
  // 在开发环境下不退出进程
  exitOnError: config.env === 'production',
});

// 创建请求日志中间件(用于Express)
export const requestLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
    });
    
    next();
  };
}

// 创建数据库查询日志器
export const dbLogger = {
  query: (query: string, parameters?: any[]) => {
    if (getLevel() === 'debug') {
    logger.debug('Database Query', { query, parameters });
    }
  },
  error: (error: Error, query?: string) => {
    logger.error('Database Error', { error: error.message, query, stack: error.stack });
  },
  info: (message: string, data?: any) => {
    logger.info(`Database: ${message}`, data);
  }
};

// 工具函数：记录带有上下文的日志
export const createContextLogger = (context: string) => ({
  debug: (message: string, meta?: any) => 
    logger.debug(message, { ...meta, context }),
  
  info: (message: string, meta?: any) => 
    logger.info(message, { ...meta, context }),
  
  warn: (message: string, meta?: any) => 
    logger.warn(message, { ...meta, context }),
  
  error: (message: string, error?: Error, meta?: any) => 
    logger.error(message, { 
    ...meta, 
    context, 
    error: error?.message, 
    stack: error?.stack 
  }),
});

// 导出类型
export type Logger = typeof logger;