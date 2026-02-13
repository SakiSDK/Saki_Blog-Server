import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index'
import { logger, requestLogger } from '@/utils/logger'
import { AppError } from './utils/errors';// 根据你的实际路径调整
import { syncDatabase, testConnection } from './models/sequelize';
import { initializeModels } from './models';
import apiRoutes from './routes/index'
import path from 'path';
import FileStore from 'session-file-store';
import { RedisSessionStore } from '@/libs/redis';

// const FileStoreInstance = FileStore(session);

export class App {
  public app: express.Application;
  constructor() { 
    //app实例化
    this.app = express();
    this.initMiddleware();
    this.initRoutes();
    this.initErrorHandler();
  }

  // 初始化中间件
  private initMiddleware(): void { 
    // 会话中间件配置
    const sessionStore = new RedisSessionStore();

    //session配置
    this.app.use(session({
      secret: config.signKey,  // 签名密钥
      resave: false,        // 是否每次请求都重新初始化session
      saveUninitialized: false,   // 是否保存未初始化的session
      // store: new FileStoreInstance({
      //   path: path.join(__dirname, '../session'),
      //   logFn: () => {},// 不打印日志
      // }),
      store: sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60,  // 1小时
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'none' : 'lax',
        // domain: config.env === 'development' ? 'localhost' : '.your-domain.com', // 显式指定域名
      },
      // 添加代理信任（如果使用反向代理）
      proxy: true,
    }))
    
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "http://localhost:3000"], // 允许加载图片
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "http://localhost:5173",
            "http://localhost:5174",
          ], // 允许本地脚本
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "http://localhost:5173",
            "http://localhost:5174",
          ], // 允许本地样式
          connectSrc: [
            "'self'",
            "http://localhost:3000",
            "https://accounts.google.com",
            "https://oauth2.googleapis.com",
            "https://www.googleapis.com"], // 允许 API 请求
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" }, // 允许跨域图片显示
    }))

    // CORS配置
    this.app.use(cors({
      origin: config.cors.origin,
      methods: config.cors.methods,
      credentials: config.cors.credentials,
      allowedHeaders: [ 'Content-Type', 'Authorization', 'X-Requested-With', 'Cookie' ],
      // 新增自定义响应头，让前端能访问X-Captcha-Key
      exposedHeaders: ['X-Captcha-Key', 'user-agent', 'Set-Cookie'],
    }))


    // 请求体解析
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    // 使用自定义请求日志中间件
    this.app.use(requestLogger())
    //开发环境日志
    if (config.env === 'development') {
      this.app.use(morgan('dev'))
    }
  }


  // 注册路由
  private initRoutes(): void {
    console.log('开始初始化路由')
    //健康检查
    this.app.use('/health', (_req, res) => {
      res.status(200).json({
        message: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        uptime: process.uptime()
      })
    })
    // API路由
    this.app.use('/api/v1', apiRoutes)
    // 静态文件服务
    this.app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))
    // 头像静态文件服务
    this.app.use('/avatars', express.static(path.join(__dirname, '../public/avatars')))
  }

  // 错误处理
  private initErrorHandler(): void {
    console.log('开始初始化错误处理')
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      if (error instanceof AppError) {
        logger.warn('自定义业务错误', {
          name: error.name,
          message: error.message,
          status: error.status,
          details: error.details,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        })
        return res.status(error.status).json({
          error: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        })
      }
      logger.error('未处理的系统错误', error, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: error.stack
      })
      // 根据环境返回不同的错误信息
      const errorResponse: any = {
        error: '内部服务器错误',
        timestamp: new Date().toISOString()
      };
      if (config.env === 'development') {
        errorResponse.message = error.message;
        errorResponse.stack = error.stack;
      }
      res.status(500).json(errorResponse);
    })
    // 处理未捕捉的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的 Promise 拒绝', {
        reason,
        promise,
        stack: reason instanceof Error ? reason.stack : undefined
      })
      //在生产环境中可能需要退出进程
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    })
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      // 在生产环境中退出进程
      if (config.env === 'production') {
        process.exit(1);
      }
    });
  }
  public async start(): Promise<void> { 
    console.log('开始启动应用程序')
    const port = config.port;
    const host = config.host;
    try {
      // 1. 测试连接数据库
      await testConnection();
      // 2. 初始化数据库
      await syncDatabase();
      // 3. 初始化模型数据
      await initializeModels();
      this.app.listen(port as number, host as string, () => {
        console.log(`服务器启动成功，访问地址为：http://${host}:${port}`);
        logger.info(`服务器启动成功`, {
          environment: config.env,
          port,
          host,
        })
      });
    } catch (error) {
      logger.error('服务器启动失败', error);
      console.error('服务器启动失败 ❌', error)
      process.exit(1);
    }
  }
}

console.log('应用程序开始启动...');
console.log('文件路径:', __filename);
const app = new App();
app.start();