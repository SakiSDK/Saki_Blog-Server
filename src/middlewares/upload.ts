import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { config } from '@/config';
import {
  compressImage,
  CompressOptions,
  ensureDirExists,
  FileError,
  FilenameStrategy,
  formatFileSize,
  generateSafeFilename
} from '@/utils/file.util';
import fs from 'fs';
import { RequestHandler } from 'express';
import express, { Request, Response, NextFunction } from 'express';


/** ---------- 类型定义 ---------- */
/** 上传配置 */
export interface UploadOptions {
  /** 是否启用压缩 */
  enableCompression: boolean;
  /** 压缩选项 */
  compressionOptions?: CompressOptions;
  /** 是否使用临时存储 */
  useTempStorage?: boolean;
  /** 临时存储后是否自动清理临时文件 */
  autoCleanTemp?: boolean;
  /** 自定义文件过滤器 */
  customFileFilter?: (req: any, file: Express.Multer.File, cb: FileFilterCallback) => void;
  /** 自定义存储子目录 */
  customStorageSubdir?: string | ((req: any, file: Express.Multer.File) => string);
  /** 文件名策略 */
  filenameStrategy?: FilenameStrategy;
  /** 上传后回调 */
  afterUpload?: (req: any, file: Express.Multer.File, filePath: string) => void;
}


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
  file: Express.Multer.File,
  customSubdir?: string | ((req: any, file: Express.Multer.File) => string)
): string => {
  // 优先使用自定义子目录
  if (customSubdir) {
    if (typeof customSubdir === 'function') {
      return customSubdir(req, file);
    }
    return customSubdir;
  }
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

/** 获取存储路径（根据是否使用临时存储） */
const getStoragePath = (
  baseDir: string,
  subdir: string,
  useTempStorage: boolean
): { uploadDir: string; tempDir?: string } => {
  const uploadDir = path.join(baseDir, subdir);

  if (useTempStorage && config.upload.tempDir) {
    const tempDir = path.join(config.upload.tempDir, subdir);
    return { uploadDir, tempDir };
  }

  return { uploadDir };
}



/** ---------- 存储引擎 ---------- */
/** 创建存储引擎 */
const createStorageEngine = (options?: UploadOptions) => {
  // 即使启用压缩，我们也先存储到磁盘（可能是临时目录），
  // 然后压缩中间件会读取、处理并覆盖它。
  // 这避免了 memoryStorage 不提供 file.path 的问题，
  // 并且对于大文件来说内存更安全。
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const subdir = getStorageSubdir(req, file, options?.customStorageSubdir);
        const { uploadDir, tempDir } = getStoragePath(
          config.upload.rootPath,
          subdir,
          options?.useTempStorage || false
        );

        // 保存子目录到请求对象，供后续中间件使用
        (req as any).uploadSubdir = subdir;

        // 确保目录存在，不存在则创建
        ensureDirExists(uploadDir);
        if (tempDir) {
          ensureDirExists(tempDir);
        }

        // 决定存储到哪个目录
        const storageDir = options?.useTempStorage && tempDir ? tempDir : uploadDir;
        cb(null, storageDir);
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
const createFileFilter = (options?: UploadOptions) => {
  return (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    const { allowedMimeTypes, allowedExtensions } = config.upload;
    const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    // 先执行自定义过滤器
    if (options?.customFileFilter) {
      return cb(new FileTypeNotAllowedError(
        file.fieldname,
        file.originalname,
        file.mimetype
      ));
    }

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
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
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
    
    if (error instanceof FileUploadError) {
      return next(error);
    }
    
    return next(error);
  };
}

/** 文件压缩中间件 */
const createCompressionMiddleware = (options?: UploadOptions) => { 
  // 如果配置中禁用了压缩，并且也没有在选项中启用，则不使用压缩
  if (!config.upload.enableCompression && !options?.enableCompression) {
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

/** 创建移动中间件（将临时文件移动到最终存储目录） */
const createMoveMiddleware = (options?: UploadOptions) => { 
  // 如果没有使用临时存储，则不移动文件
  if (!options?.useTempStorage && !config.upload.tempDir) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = (req as any).files;
      if (!files || Object.keys(files).length === 0) {
        return next();
      }
      
      const subdir = (req as any).uploadSubdir || 'uploads';
      const tempDir = path.join(config.upload.tempDir, subdir);
      const uploadDir = path.join(config.upload.rootPath, subdir);
      
      // 确保目标目录存在
      ensureDirExists(uploadDir);
      
      const moveFile = async (file: Express.Multer.File) => {
        const tempPath = file.path;
        const targetPath = path.join(uploadDir, file.filename);
        
        // 检查文件是否在临时目录中
        if (tempPath && tempPath.startsWith(config.upload.tempDir)) {
          await fs.promises.rename(tempPath, targetPath);
          file.path = targetPath; // 更新文件路径
        }
      };
      
      // 移动所有文件
      if (Array.isArray(files)) {
        for (const file of files) {
          await moveFile(file);
        }
      } else {
        for (const fieldFiles of Object.values(files)) {
          for (const file of fieldFiles as Express.Multer.File[]) {
            await moveFile(file);
          }
        }
      }
      
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      next(new FileError(`文件移动失败: ${errorMessage}`));
    }
  };
}

/** 清理临时文件中间件 */
const createCleanupMiddleware = (options?: UploadOptions) => {
  // 如果不需要自动清理临时文件，则跳过
  const shouldClean = options?.autoCleanTemp !== false && options?.useTempStorage;
  if (!shouldClean || !config.upload.tempDir) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  
  return async (req: Request, _res: Response, next: NextFunction) => {
    // 在响应结束后清理临时文件
    const cleanup = async () => {
      try {
        const subdir = (req as any).uploadSubdir;
        if (!subdir) return;
        
        const tempDir = path.join(config.upload.tempDir, subdir);
        
        // 检查目录是否存在
        if (fs.existsSync(tempDir)) {
          // 删除目录及其内容
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('清理临时文件失败:', error);
      }
    };
    
    // 在响应结束时执行清理
    const originalEnd = (_res as any).end;
    (_res as any).end = function(chunk: any, encoding: any, callback: any) {
      originalEnd.call(this, chunk, encoding, () => {
        cleanup().finally(() => {
          if (callback) callback();
        });
      });
    };
    
    next();
  };
}

/** 上传中间件工厂函数 */
export const createUploadMiddleware = (
  multerOptions?: {
    fields?: multer.Field[];
    fileFilter?: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;
    limits?: multer.Options['limits'];
  },
  uploadOptions?: UploadOptions
): RequestHandler[] => {
  const upload = multer({
    storage: createStorageEngine(uploadOptions),
    limits: {
      fileSize: config.upload.maxFileSize,
      files: config.upload.maxFileCount,
      ...multerOptions?.limits,
    },
    fileFilter: multerOptions?.fileFilter || createFileFilter(uploadOptions),
    preservePath: false,
  });
  
  // 创建中间件链
  const middlewares: RequestHandler[] = [
    // 上传中间件
    multerOptions?.fields 
      ? upload.fields(multerOptions.fields)
      : upload.any(),
  ];
  
  // 根据选项添加中间件
  if (uploadOptions?.enableCompression || config.upload.enableCompression) {
    middlewares.push(createCompressionMiddleware(uploadOptions));
  }
  
  if (uploadOptions?.useTempStorage) {
    middlewares.push(createMoveMiddleware(uploadOptions));
  }
  
  if (uploadOptions?.autoCleanTemp !== false && uploadOptions?.useTempStorage) {
    middlewares.push(createCleanupMiddleware(uploadOptions));
  }
  
  return middlewares;
};

/** 预配置的上传中间件 */
export const upload = {
  /** 
   * 创建自定义上传中间件
   */
  create: (multerOptions?: {
    fields?: multer.Field[];
    fileFilter?: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;
    limits?: multer.Options['limits'];
  }, uploadOptions?: UploadOptions): RequestHandler[] => {
    return createUploadMiddleware(multerOptions, uploadOptions);
  },
  /**
   * 通用单文件上传
   * @param fieldName 表单字段名 (默认: 'file')
   */
  single: (
    fieldName: string = 'file',
    options?: UploadOptions
  ): RequestHandler[] => createUploadMiddleware(
    { fields: [{ name: fieldName, maxCount: 1 }] },
    options
  ),

  /**
   * 通用多文件上传 (同字段)
   * @param fieldName 表单字段名 (默认: 'files')
   * @param maxCount 最大文件数 (默认: 10)
   */
  array: (
    fieldName: string = 'files',
    maxCount: number = 10,
    options?: UploadOptions
  ): RequestHandler[] => createUploadMiddleware(
    { fields: [{ name: fieldName, maxCount }] },
    options
  ),

  /**
   * 多字段混合上传
   * @example upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'photos', maxCount: 8 }])
   */
  fields: (
    fields: multer.Field[],
    options?: UploadOptions
  ): RequestHandler[] => createUploadMiddleware({ fields }, options),
  
  /**
   * 头像上传 (限制 2MB)
   */
  avatar: (
    fieldName: string = 'avatar',
    compressionQuality: number = 80
  ): RequestHandler[] => createUploadMiddleware(
    {
      fields: [{ name: fieldName, maxCount: 1 }],
      limits: { fileSize: 2 * 1024 * 1024 } // 2MB
    },
    {
      enableCompression: true,
      compressionOptions: {
        quality: compressionQuality,
        width: 800,
        height: 800,
        format: 'webp'
      },
      useTempStorage: true,
      autoCleanTemp: true
    }
  ),

  /**
   * 文章图片上传
   */
  articleImages: (
    fieldName: string = 'images',
    options?: UploadOptions
  ): RequestHandler[] => createUploadMiddleware(
    {
      fields: [{ name: fieldName, maxCount: 20 }],
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB
    },
    {
      enableCompression: true,
      compressionOptions: { quality: 85, format: 'avif' },
      useTempStorage: true,
      customStorageSubdir: 'articles/images',
      ...options
    }
  ),

  /**
   * 文章上传 (不压缩直接存储)
   */
  document: (
    fieldName: string = 'document',
    maxSizeMB: number = 50
  ): RequestHandler[] => createUploadMiddleware(
    {
      fields: [{ name: fieldName, maxCount: 1 }],
      limits: { fileSize: maxSizeMB * 1024 * 1024 }
    },
    {
      enableCompression: false,
      useTempStorage: false,
      customFileFilter: (req, file) => {
        // 只允许文档类型
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown'
        ];
        return allowedMimes.includes(file.mimetype);
      }
    }
  ),
  
  /**
   * 大文件上传 (使用临时存储，不压缩)
   */
  largeFile: (
    fieldName: string = 'file',
    maxSizeMB: number = 500
  ): RequestHandler[] => createUploadMiddleware(
    {
      fields: [{ name: fieldName, maxCount: 1 }],
      limits: { fileSize: maxSizeMB * 1024 * 1024 }
    },
    {
      enableCompression: false,
      useTempStorage: true,
      autoCleanTemp: true
    }
  ),
  
  /**
   * 图像上传 (带智能压缩)
   */
  image: (
    fieldName: string = 'image',
    options?: UploadOptions & {
      resize?: { width: number; height?: number };
      format?: 'webp' | 'avif';
    }
  ): RequestHandler[] => {
    // 构建压缩选项，只包含存在的值
    const compressionOptions: CompressOptions = {
      quality: options?.compressionOptions?.quality || 85,
      format: options?.format || 'webp'
    };

    // 只有当width存在时才添加到配置中
    if (options?.resize?.width !== undefined) {
      compressionOptions.width = options.resize.width;
    }

    // 只有当height存在时才添加到配置中
    if (options?.resize?.height !== undefined) {
      compressionOptions.height = options.resize.height;
    }

    return createUploadMiddleware(
      {
        fields: [{ name: fieldName, maxCount: 1 }],
        limits: { fileSize: 20 * 1024 * 1024 } // 20MB
      },
      {
        enableCompression: true,
        compressionOptions,
        useTempStorage: options?.useTempStorage ?? true,
        autoCleanTemp: options?.autoCleanTemp ?? true,
        ...options
      }
    );
  }
}

export const uploadErrorHandler = createErrorHandler();
export default upload;