import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { config } from '@/config';
import { compressImage, ensureDirExists, FileError, formatFileSize, generateSafeFilename } from '@/utils/file.util';
import { NextFunction } from 'express';
import fs from 'fs';
import { RequestHandler } from 'express';

/** ---------- 自定义错误类型 ---------- */
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

/** ---------- 辅助函数 ---------- */
/** 获取文件存储子目录 */
const getStorageSubdir = (
  req: any,
  file: Express.Multer.File
): string => {
  const { storageSubdir } = config.upload;
  // 如果是日期格式字符串，替换为实际日期
  if (typeof storageSubdir === 'string' && storageSubdir.includes('{date}')) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return storageSubdir.replace('{date}', `${year}/${month}/${day}`);
  }

  return storageSubdir as string || 'uploads';
}


/** ---------- 存储引擎 ---------- */
/** 创建存储引擎 */
const createStorageEngine = () => {
  if (config.upload.enableCompression) {
    // 如果需要压缩，使用内存存储引擎，然后在文件处理中间件中进行压缩
    return multer.memoryStorage();
  }
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const subdir = getStorageSubdir(req, file);
        const uploadDir = path.join(config.upload.rootPath, subdir);
        const tempDir = path.join(config.upload.tempDir, subdir);
        // 确保目录存在，不存在则创建
        ensureDirExists(uploadDir);
        ensureDirExists(tempDir);
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, '上传目录创建失败');
      }
    },
    filename: (req, file, cb) => { 
      try {
        const filename = generateSafeFilename(
          file.originalname,
          config.upload.filenameStrategy,
          config.upload.useHash
        );
        cb(null, filename);
      } catch (error) {
        cb(error as Error, '文件名生成失败');
      }
    }
  })
}

/** 创建文件过滤器 */
const createFileFilter = () => {
  return (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    const { allowedMimeTypes, allowedExtensions } = config.upload;
    const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    // 检查 MIME 类型
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new FileTypeNotAllowedError(
        file.fieldname,
        file.originalname,
        file.mimetype
      ));
    }
    
    // 检查文件扩展名
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExt)) {
      return cb(new FileTypeNotAllowedError(
        file.fieldname,
        file.originalname,
        file.mimetype
      ));
    }
    
    // 自定义文件校验逻辑（例如检查文件头等）
    // 这里可以添加更多校验逻辑
    
    cb(null, true);
  };
}

/** 创建错误处理器 */
const createErrorHandler = () => {
  return (error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      // Multer 错误处理
      let customError: FileUploadError;
      
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          customError = new FileSizeExceededError(
            error.field || 'unknown',
            error.message,
            config.upload.maxFileSize
          );
          break;
        case 'LIMIT_FILE_COUNT':
          customError = new FileUploadError(
            `文件数量超过限制 (最多 ${config.upload.maxFileCount} 个)`,
            'FILE_COUNT_EXCEEDED'
          );
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          customError = new FileUploadError(
            '文件字段名不符合预期',
            'UNEXPECTED_FIELD'
          );
          break;
        default:
          customError = new FileUploadError(
            error.message,
            'UPLOAD_ERROR'
          );
      }
      
      return next(customError);
    }
    
    // 自定义错误类型处理
    if (error instanceof FileUploadError) {
      return next(error);
    }
    
    // 其他错误
    return next(error);
  };
}

/** 文件压缩中间件 */
const createCompressionMiddleware = () => { 
  if (!config.upload.enableCompression) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  
  return async (req: any, _res: Response, next: NextFunction) => {
    try {
      const files = req.files;
      if (!files || Object.keys(files).length === 0) {
        return next();
      }
      // 处理不同的Multer模式：
      // - .array() → files 是数组
      // - .fields() → files 是 { fieldname: File[] }
      // - .single() → 不会进这个中间件（因为 req.files 不存在）
      const processFile = async (file: Express.Multer.File) => {
        // 仅处理图像
        if (!file.mimetype.startsWith('image/')) {
          return;
        }

        // 读取原始文件 buffer
        let buffer: Buffer;
        try {
          buffer = await fs.promises.readFile(file.path);
        } catch (error) {
          throw new FileError(`读取上传文件失败: ${file.path}`);
        }

        // 执行压缩（使用默认或者配置化的选项）
        const compressedBuffer = await compressImage(buffer, {});

        // 覆盖原始文件 buffer
        await fs.promises.writeFile(file.path, compressedBuffer);

        // 更新文件元信息
        file.size = compressedBuffer.length;
      }

      // 遍历所有上传的文件
      if (Array.isArray(files)) {
        // upload.array()
        for (const file of files) {
          await processFile(file);
        }
      } else {
        // upload.fields() → { avatar: [...], images: [...] }
        for (const fieldFiles of Object.values(files)) {
          for (const file of fieldFiles as Express.Multer.File[]) {
            await processFile(file);
          }
        }
      }
      next();
    } catch (error) {
      // 类型守卫检查
      if (error instanceof FileError) {
        next(error);
      } else {
        // 确保 error 是 Error 类型或提供默认消息
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        next(new FileError(`文件压缩过程中发生未知错误: ${errorMessage}`));
      }
    }
  };
}

/** 清理临时文件中间件 */
const createCleanupMiddleware = () => {
  if (!config.upload.tempDir) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return async (req: any, _res: Response, next: NextFunction) => {
    try {
      const files = req.files;
      if (!files || Object.keys(files).length === 0) {
        return next();
      }
      // 处理不同的Multer模式：
      // - .array() → files 是数组
      // - .fields() → files 是 { fieldname: File[] }
      // - .single() → 不会进这个中间件（因为 req
      const cleanupFile = async (file: Express.Multer.File) => {
        // 仅处理图像
        if (!file.mimetype.startsWith('image/')) {
          return;
        }
        // 删除临时文件
        await fs.promises.unlink(file.path);
      }
      // 遍历所有上传的文件
      if (Array.isArray(files)) {
        // upload.array()
        for (const file of files) {
          await cleanupFile(file);
        }
      } else {
        // upload.fields() → { avatar: [...], images: [...] }
        for (const fieldFiles of Object.values(files)) {
          for (const file of fieldFiles as Express.Multer.File[]) {
            await cleanupFile(file);
          }
        }
      }
      next();
    } catch (error) {
      // 类型守卫检查
      if (error instanceof FileError) {
        next(error);
      } else {
        // 确保 error 是 Error 类型或提供默认消息
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        next(new FileError(`文件清理过程中发生未知错误: ${errorMessage}`));
      }
    }
  }
}

/** 上传中间件工厂函数 */
export const createUploadMiddleware = (options?: {
  fields?: multer.Field[];
  fileFilter?: (req: any, file: Express.Multer.File, cb: FileFilterCallback) => void;
  limits?: multer.Options['limits'];
}): RequestHandler[] => {
  const upload = multer({
    storage: createStorageEngine(),
    limits: {
      fileSize: config.upload.maxFileSize,
      files: config.upload.maxFileCount,
      ...options?.limits,
    },
    fileFilter: options?.fileFilter || createFileFilter(),
    // 保留原始文件名信息
    preservePath: false,
  })

  // 创建中间件链
  const middlewares = [
    // 上传中间件
    options?.fields 
      ? upload.fields(options.fields)
      : upload.any(),
    
    // 错误处理中间件
    createErrorHandler(),
    
    // 压缩中间件
    createCompressionMiddleware(),
    
    // 清理中间件
    createCleanupMiddleware(),
  ];
  
  // 返回组合中间件
  return middlewares as RequestHandler[];
}

/** 预配置的上传中间件 */
export const upload = {
  /**
   * 通用单文件上传
   * @param fieldName 表单字段名 (默认: 'file')
   */
  single: (fieldName: string = 'file'): RequestHandler[] => createUploadMiddleware({
    fields: [{ name: fieldName, maxCount: 1 }]
  }),

  /**
   * 通用多文件上传 (同字段)
   * @param fieldName 表单字段名 (默认: 'files')
   * @param maxCount 最大文件数 (默认: 10)
   */
  array: (fieldName: string = 'files', maxCount: number = 10): RequestHandler[] => createUploadMiddleware({
    fields: [{ name: fieldName, maxCount }]
  }),

  /**
   * 多字段混合上传
   * @example upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'photos', maxCount: 8 }])
   */
  fields: (fields: multer.Field[]): RequestHandler[] => createUploadMiddleware({
    fields
  }),

  /**
   * 仅解析文本字段 (不处理文件)
   */
  none: (): RequestHandler[] => createUploadMiddleware({
    limits: { files: 0 }
  }),

  /**
   * 头像上传 (限制 2MB)
   */
  avatar: (fieldName: string = 'avatar'): RequestHandler[] => createUploadMiddleware({
    fields: [{ name: fieldName, maxCount: 1 }],
    limits: { fileSize: 2 * 1024 * 1024 } // 覆盖默认大小限制
  }),

  /**
   * 文章图片上传
   */
  articleImages: (fieldName: string = 'images'): RequestHandler[] => createUploadMiddleware({
    fields: [{ name: fieldName, maxCount: 20 }]
  }),

  /**
   * 文章上传
   */
  article: (fieldName: string = 'file'): RequestHandler[] => createUploadMiddleware({
    fields: [{ name: fieldName, maxCount: 1 }]
  })
};
