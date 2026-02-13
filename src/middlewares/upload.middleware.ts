import multer, { FileFilterCallback, Options } from 'multer';
import path from 'path';
import { config } from '@/config';
import fs from 'fs';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  compressImage,
  CompressOptions,
} from '@/utils/image.util';
import {
  ensureDirExists, formatFileSize, generateSafeFilename,
  isDocumentTypeAllowed, isImageTypeAllowed, isMusicTypeAllowed
} from '@/utils/file.util';


/** ---------- 上传中间件配置选项 ---------- */
export interface UploadMiddlewareOptions {
  /** 单文件字段名或多文件字段配置 */
  field: 'none' | string | { name: string; maxCount?: number };
  /** 最大文件大小 */
  maxSizeMB?: number;
  /** 是启用错误处理中间件 (默认: true) */
  enableErrorHandler?: boolean;
  /** 自定义存储引擎 */
  storage?: multer.StorageEngine;
  /** 其他 Multer 配置 */
  limits?: Partial<multer.Options['limits']>;
  /** 自定义存储路径 */
  path?: string;
  /** 上传类型 */
  type?: 'image' | 'document' | 'music' | 'other' | 'common';
  /** 压缩配置 */
  compression?: {
    /** 是否启用 (默认: true) */
    enable?: boolean;
    /** 压缩选项 */
    options?: CompressOptions;
  };
}

/** 上传配置选项 */
interface UploadConfig {
  /** 自定义存储路径 */
  path?: string;
  /** 其他配置 */
  [key: string]: any;
}

/** ---------- 自定义错误类型 ---------- */
/** 文件上传错误 */
export class FileUploadError extends Error {
  constructor(
    message: string,
    public code?: string,
    public field?: string,
    public fileName?: string
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/** 图片压缩错误 */
export class FileCompressError extends FileUploadError {
  constructor(field: string, fileName: string) {
    super(
      `图片压缩错误: ${fileName}`,
      'FILE_COMPRESS_ERROR',
      field,
      fileName
    );
    this.name = 'FileCompressError';
  }
}

/** 文件大小超出限制错误 */
export class FileSizeExceededError extends FileUploadError {
  constructor(field: string, fileName: string, maxSize: number) {
    super(
      `文件大小超过限制: ${fileName} (最大 ${formatFileSize(maxSize)})`,
      'FILE_SIZE_EXCEEDED',
      field,
      fileName
    );
    this.name = 'FileSizeExceededError';
  }
}

/** 文件类型不支持错误 */
export class FileTypeNotAllowedError extends FileUploadError {
  constructor(field: string, fileName: string, mimeType: string) {
    super(
      `文件类型不支持: ${fileName} (${mimeType})`,
      'FILE_TYPE_NOT_ALLOWED',
      field,
      fileName
    );
    this.name = 'FileTypeNotAllowedError';
  }
}

/** ---------- 常量设置 ---------- */
/** 临时存储目录 */
const TEMP_DIR = config.upload.tempDir;
/** 存储目录 */
const STORAGE_DIR = config.upload.rootPath;


/** ---------- 辅助函数 ---------- */
/** 
 * 获取存储路径
 * @param subdir 子目录
 * @param useTempStorage 是否使用临时存储
 * @returns 存储路径
 */
const getStoragePath = (
  subdir: string,
): string => {
  // 默认使用配置中的临时存储路径，正式上传后移入到正式目录中
  const baseDir = TEMP_DIR || STORAGE_DIR;
  const storagePath = path.join(baseDir, subdir);
  return storagePath;
}


/** ---------- 上传相关模块 ---------- */
/** 创建存储引擎 */
const createStorageEngine = () => {
  return multer.diskStorage({
    destination: async (
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void
    ) => {
      // 从 req 中获取子目录
      const subdir = (req as any).uploadSubdir || 'default';
      // 获取完整存储路径（基于 TEMP_DIR）
      const storagePath = getStoragePath(subdir);
      console.log('存储路径:', storagePath);

      try {
        // 确保存储目录存在
        await ensureDirExists(storagePath);
        // 返回存储路径
        cb(null, storagePath);
      } catch (error) {
        // 创建存储目录失败
        cb(error as Error, '');
      }
    },
    filename: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      // 获取原始文件拓展名
      const ext = path.extname(file.originalname).toLowerCase();
      // 生成唯一文件名，使用UUID
      const uniqueSuffix = generateSafeFilename(file.originalname);

      cb(null, `${uniqueSuffix}${ext}`);
    }
  })
}

/** 
 * 创建文件过滤器
 */
const createFileFilter = () => {
  return (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    // 获取文件类型
    const fileType = file.mimetype;
    // 获取期望的上传类型（默认为 'image'）
    const uploadType = (req as any).uploadType || 'image';
    // 是否允许该类型
    let isAllowedType = false;

    // 安全检查：如果配置中没有该类型，拒绝上传
    if (uploadType === 'image') {
      isAllowedType = isImageTypeAllowed(fileType);
    } else if (uploadType === 'document') {
      isAllowedType = isDocumentTypeAllowed(fileType);
    } else if (uploadType === 'music') {
      isAllowedType = isMusicTypeAllowed(fileType);
    } else {  
      isAllowedType = false;
    }

    if (!isAllowedType) {
      // 不允许的类型
      const error = new FileTypeNotAllowedError(
        file.fieldname,
        file.originalname,
        fileType
      );
      return cb(error);
    }

    // 允许文件通过
    cb(null, true);
  }
}

/**
 * 创建压缩和缩略图处理中间件
 */
const createCompressionMiddleware = (options: UploadMiddlewareOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. 检查前端参数 compress (auto | off)
    const compressParam = req.query.compress as string;
    if (compressParam === 'off') {
      return next();
    }

    // 2. 检查配置是否启用压缩
    if (!options.compression?.enable) {
      return next();
    }

    // 3. 获取文件列表
    const files = req.file 
      ? [req.file] 
      : (Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat());

    if (files.length === 0) return next();

    try {
      for (const file of files) {
        // 仅处理图片
        if (!file.mimetype.startsWith('image/')) continue;

        const originalPath = file.path;
        // 读取文件
        const fileBuffer = await fs.promises.readFile(originalPath);
        
        // --- 压缩处理 ---
        // 默认为 true (由上层检查保证)
        try {
             // 默认转为 webp 以获得更好兼容性和压缩率，或者使用配置的格式
            const targetFormat = options.compression?.options?.format || 'webp';
            const compressedBuffer = await compressImage(fileBuffer, {
              format: targetFormat,
              ...options.compression?.options
            });

            // 检查是否需要修改扩展名
            const currentExt = path.extname(file.filename).toLowerCase().replace('.', '');
            const newExt = targetFormat;
            
            // 如果压缩后大小反而变大，且格式未改变，则保留原文件
            if (compressedBuffer.length > fileBuffer.length && currentExt === newExt) {
              file.size = fileBuffer.length;
              // 不做任何写入操作，直接继续
            } else if (currentExt !== newExt) {
              // 格式改变，必须写入（即使变大也写入，因为前端期望得到 avif）
              // 或者您可以选择：如果变大太多，是否回退到原图？
              // 这里我们假设如果格式变了，就必须转换。
              
              // 更新路径和文件名
              const dir = path.dirname(originalPath);
              const name = path.basename(originalPath, path.extname(originalPath));
              const newFilename = `${name}.${newExt}`;
              const newPath = path.join(dir, newFilename);

              // 写入新文件
              await fs.promises.writeFile(newPath, compressedBuffer);
              // 删除旧文件
              await fs.promises.unlink(originalPath);

              // 更新 req.file 属性
              file.path = newPath;
              file.filename = newFilename;
              file.mimetype = `image/${newExt}`;
              file.size = compressedBuffer.length;
            } else {
              // 格式未变，且确实变小了（或强制覆盖）
              // 覆盖原文件
              await fs.promises.writeFile(originalPath, compressedBuffer);
              file.size = compressedBuffer.length;
            }
          } catch (error) {
            throw new FileCompressError(file.fieldname, file.originalname);
          }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/** 创建错误处理器 */
const createErrorHandler = () => {
  return (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => { 
    if (err instanceof multer.MulterError) {
      let message = '文件上传失败';
      let code = 'UPLOAD_ERROR';
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = `文件大小超过限制 (最大 ${formatFileSize(config.upload.maxFileSize)})`;
          code = 'FILE_SIZE_EXCEEDED';
          break;
        case 'LIMIT_FILE_COUNT':
          message = `文件数量超过限制 (最多 ${config.upload.maxFileCount} 个)`;
          code = 'FILE_COUNT_EXCEEDED';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = '文件字段名不符合预期';
          code = 'UNEXPECTED_FIELD';
          break;
        default:
          message = err.message;
      }
      
      return res.status(400).json({
        success: false,
        code: 400,
        message,
        data: { error_code: code }
      });
    }
    
    if (err instanceof FileUploadError) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: err.message,
        data: { error_code: err.code }
      });
    }

    if (err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: err.message || '文件上传发生未知错误',
        data: null
      });
    }

    return next();
  }
}

/** 上传中间件工厂函数 */
export const createUploadMiddleware = (options: UploadMiddlewareOptions): RequestHandler[] => {
  const {
    field,
    maxSizeMB = 5,
    enableErrorHandler = true,
    storage,
    limits = {},
    path = 'default',
    type = 'common',
    compression
  } = options;

  // 配置注入中间件
  const configMiddleware: RequestHandler = (req, res, next) => {
    (req as any).uploadSubdir = path;
    (req as any).uploadType = type;
    next();
  };

  // 构建Multer配置
  const multerConfig: Options = {
    storage: storage || createStorageEngine(),
    fileFilter: createFileFilter(),
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: typeof field === 'string' ? 1 : field.maxCount || 10,
      ...limits
    },
    preservePath: true,
  }

  const upload = multer(multerConfig);

  // 上传核心中间件
  const uploadMiddleware: RequestHandler = (() => {
    // 仅解析 FormData（无文件）
    if (field === 'none') {
      return upload.none();
    }

    // 单文件
    if (typeof field === 'string') {
      return upload.single(field);
    }
    // 多文件
    if('name' in field) {
      return upload.array(field.name, field.maxCount || 10);
    }

    // 多字段
    return upload.fields(field);
  })(); 

  // 压缩/缩略图中间件
  const compressionMiddleware = createCompressionMiddleware(options);

  const middlewares: any[] = [configMiddleware, uploadMiddleware, compressionMiddleware];
  if (enableErrorHandler) {
    middlewares.push(createErrorHandler());
  }
  
  return middlewares;
}


/** 预配置的上传中间件 */
export const upload: Record<string, (config?: UploadConfig) => RequestHandler[]> = {
  /** 仅解析 FormData (文章发布/表单提交) */
  none: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'none',
    enableErrorHandler: true,
    ...config
  }),
  /** 图片上传 */
  image: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'image',
    maxSizeMB: 5,
    enableErrorHandler: true,
    type: 'image',
    compression: {
      enable: true,
      options: { format: 'avif', quality: 60, effort: 3 }
    },
    ...config
  }),
  /** 多图片上传 */
  images: (config: UploadConfig = {}) => createUploadMiddleware({
    field: {
      name: 'images',
      maxCount: 5,
    },
    maxSizeMB: 5,
    enableErrorHandler: true,
    type: 'image',
    compression: {
      enable: true,
      options: { format: 'avif', quality: 60, effort: 3 }
    },
    ...config
  }),
  /** 文档上传 */
  document: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'document',
    maxSizeMB: 10,
    enableErrorHandler: true,
    type: 'document',
    ...config
  }),
  /** 多文档上传 */
  documents: (config: UploadConfig = {}) => createUploadMiddleware({
    field: {
      name: 'documents',
      maxCount: 5,
    },
    maxSizeMB: 10,
    enableErrorHandler: true,
    type: 'document',
    ...config
  }),
  /** 音频上传 */
  music: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'audio',
    maxSizeMB: 10,
    enableErrorHandler: true,
    type: 'music',
    ...config
  }),
  /** 其他文件上传 */
  other: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'other',
    maxSizeMB: 10,
    enableErrorHandler: true,
    type: 'other',
    ...config
  }),
  /** 通用上传 */
  common: (config: UploadConfig = {}) => createUploadMiddleware({
    field: 'common',
    maxSizeMB: 10,
    enableErrorHandler: true,
    type: 'common',
    ...config
  }),
}
