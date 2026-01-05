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
  generateDateDir,
  generateSafeFilename
} from '@/utils/file.util';
import fs from 'fs';
import { RequestHandler } from 'express';
import express, { Request, Response, NextFunction } from 'express';


// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      uploadInfo?: {
        subdir: string;
        isEditing: boolean;
        editSessionId?: string;
        resourceType: string;
        resourceId: string;
      };
      uploadSubdir?: string;
    }
  }
}

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
  /** 上传类型，用于生成不同的目录结构 */
  resourceType?: 'post' | 'avatar' | 'general';
  /** 资源ID */
  resourceId?: string | ((req: any) => string);
  /** 是否为编辑模式（使用临时存储） */
  isEditing?: boolean;
  /** 编辑会话ID（用于临时存储） */
  editSessionId?: string | ((req: any) => string);
}
/** 文件移动结果 */
export interface FileMoveResult {
  success: boolean;
  originalPath: string;
  newPath: string;
  relativePath: string;
  url: string;
  filename: string;
  error?: string;
}
/** 临时文件信息 */
export interface TempFileInfo {
  filename: string;
  originalName: string;
  tempPath: string;
  permanentPath: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  editSessionId: string;
  resourceType: string;
  resourceId?: string;
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
/** 获取资源ID */
const getResourceId = (req: any, options?: UploadOptions): string => {
  if(!options?.resourceId) return '';
  if(typeof options.resourceId === 'function') return options.resourceId(req);
  return options.resourceId;
}

/** 获取编辑会话ID */
const getEditSessionId = (req: any, options?: UploadOptions): string => {
  if (options?.editSessionId) {
    if (typeof options.editSessionId === 'function') {
      return options.editSessionId(req);
    }
    return options.editSessionId;
  }
  
  // 如果没有提供编辑会话ID，生成一个基于时间戳和随机数的ID
  return `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/** 生成最终的存储子目录 */
const generateStorageSubdir = (
  req: any,
  file: Express.Multer.File,
  options?: UploadOptions
): string => {
  // 如果有自定义子目录，优先使用
  if (options?.customStorageSubdir) {
    if (typeof options.customStorageSubdir === 'function') {
      return options.customStorageSubdir(req, file);
    }
    return options.customStorageSubdir;
  }

  const resourceId = getResourceId(req, options);
  const datePath = generateDateDir();
  const resourceType = options?.resourceType || 'general';
  const isEditing = options?.isEditing || options?.useTempStorage;

  // 如果是编辑模式，使用临时目录
  if (isEditing) {
    const editSessionId = getEditSessionId(req, options);
    
    switch (resourceType) {
      case 'post':
        return `posts/editing/${editSessionId}`;
      case 'avatar':
        return `avatars/editing/${editSessionId}`;
      default:
        return `general/editing/${editSessionId}`;
    }
  }  

  switch (resourceType) {
    case 'post':
      return `images/posts/${datePath}/post_${resourceId}`;
    case 'avatar':
      return `images/avatars/${datePath}/user_${resourceId}`;
    case 'general':
    default:
      return `images/general/${datePath}`;
  }
}

/** 获取存储路径 */
const getStoragePath = (
  subdir: string,
  useTempStorage: boolean
): { uploadDir: string; tempDir?: string } => {
  const baseDir = useTempStorage ? config.upload.tempDir : config.upload.rootPath;
  const uploadDir = path.join(baseDir, subdir);
  return { uploadDir };
};



/** ---------- 存储引擎 ---------- */
/** 创建存储引擎 */
const createStorageEngine = (options?: UploadOptions) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const subdir = generateStorageSubdir(req, file, options);
        const useTempStorage = options?.useTempStorage || false;
        const { uploadDir } = getStoragePath(subdir, useTempStorage);

        // 保存信息到请求对象
        (req as any).uploadInfo = {
          subdir,
          isEditing: useTempStorage,
          editSessionId: useTempStorage ? getEditSessionId(req, options) : undefined,
          resourceType: options?.resourceType || 'general',
          resourceId: getResourceId(req, options)
        };

        ensureDirExists(uploadDir);
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, '上传目录创建失败');
      }
    },
    filename: (req, file, cb) => { 
      try {
        const strategy = options?.filenameStrategy || config.upload.filenameStrategy;
        const filename = generateSafeFilename(
          file.originalname,
          strategy,
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
  const shouldCompress = config.upload.enableCompression || options?.enableCompression;
  if (!shouldCompress) return (req: Request, res: Response, next: NextFunction) => next();

  return async (req: any, _res: Response, next: NextFunction) => {
    try {
      const files = req.files;
      if (!files || Object.keys(files).length === 0) return next();

      const compressionOptions = options?.compressionOptions || {};

      const processFile = async (file: Express.Multer.File) => {
        if (!file.mimetype.startsWith('image/')) return;

        const buffer = await fs.promises.readFile(file.path);
        const compressedBuffer = await compressImage(buffer, compressionOptions);
        await fs.promises.writeFile(file.path, compressedBuffer);
        file.size = compressedBuffer.length;
      };

      if (Array.isArray(files)) {
        await Promise.all(files.map(processFile));
      } else {
        const fileArrays = Object.values(files) as Express.Multer.File[][];
        for (const fileArray of fileArrays) {
          await Promise.all(fileArray.map(processFile));
        }
      }

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      next(new FileError(`文件压缩失败: ${message}`));
    }
  }
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
      if (!files || Object.keys(files).length === 0) return next();

      const uploadInfo = req.uploadInfo;
      if (uploadInfo?.isEditing) return next(); // 编辑模式不移动

      const { subdir } = uploadInfo || {};
      if (!subdir) return next();

      const tempDir = path.join(config.upload.tempDir, subdir);
      const uploadDir = path.join(config.upload.rootPath, subdir);
      
      // 确保目标目录存在
      ensureDirExists(uploadDir);
      
      const moveFile = async (file: Express.Multer.File) => {
        if (file.path?.startsWith(config.upload.tempDir)) {
          const targetPath = path.join(uploadDir, file.filename);
          await fs.promises.rename(file.path, targetPath);
          file.path = targetPath;
        }
      };
      
      // 移动所有文件
      if (Array.isArray(files)) {
        await Promise.all(files.map(moveFile));
      } else {
        const fileArrays = Object.values(files) as Express.Multer.File[][];
        for (const fileArray of fileArrays) {
          await Promise.all(fileArray.map(moveFile));
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
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // 在响应结束后清理临时文件
    const cleanup = async () => {
      try {
        const uploadInfo = req.uploadInfo;
        if (!uploadInfo?.subdir || uploadInfo.isEditing) return;
        
        const tempDir = path.join(config.upload.tempDir, uploadInfo.subdir);
        if (fs.existsSync(tempDir)) {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('清理临时文件失败:', error);
      }
    };
    
    // 在响应结束时执行清理
    const originalEnd = (res as any).end;
    (res as any).end = function (...args: any[]) {
      cleanup().finally(() => {
        originalEnd.apply(this, args);
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
  /** 创建自定义上传中间件 */
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
  fields: (fields: multer.Field[], options?: UploadOptions): RequestHandler[] =>
    createUploadMiddleware({ fields }, options),
  
  /** 编辑模式上传（临时存储） */
  editing: {
    /** 编辑文章图片 */
    postImage: (fieldName = 'image', options?: UploadOptions): RequestHandler[] =>
      createUploadMiddleware(
        {
          fields: [{ name: fieldName, maxCount: 1 }],
          limits: { fileSize: 10 * 1024 * 1024 },
        },
        {
          resourceType: 'post',
          isEditing: true,
          useTempStorage: true,
          enableCompression: true,
          compressionOptions: { quality: 85, format: 'webp' },
          autoCleanTemp: false,
          ...options,
        }
      ),

    /** 批量编辑文章图片 */
    postImages: (fieldName = 'images', maxCount = 10, options?: UploadOptions): RequestHandler[] =>
      createUploadMiddleware(
        {
          fields: [{ name: fieldName, maxCount }],
          limits: { fileSize: 10 * 1024 * 1024 },
        },
        {
          resourceType: 'post',
          isEditing: true,
          useTempStorage: true,
          enableCompression: true,
          compressionOptions: { quality: 85, format: 'webp' },
          autoCleanTemp: false,
          ...options,
        }
      ),
  },

  /** 正式上传 */
  permanent: {
    /** 文章图片 */
    postImage: (fieldName = 'image', options?: UploadOptions): RequestHandler[] =>
      createUploadMiddleware(
        {
          fields: [{ name: fieldName, maxCount: 1 }],
          limits: { fileSize: 10 * 1024 * 1024 },
        },
        {
          resourceType: 'post',
          enableCompression: true,
          compressionOptions: { quality: 85, format: 'webp' },
          useTempStorage: true,
          autoCleanTemp: true,
          ...options,
        }
      ),

    /** 批量文章图片 */
    postImages: (fieldName = 'images', maxCount = 10, options?: UploadOptions): RequestHandler[] =>
      createUploadMiddleware(
        {
          fields: [{ name: fieldName, maxCount }],
          limits: { fileSize: 10 * 1024 * 1024 },
        },
        {
          resourceType: 'post',
          enableCompression: true,
          compressionOptions: { quality: 85, format: 'webp' },
          useTempStorage: true,
          autoCleanTemp: true,
          ...options,
        }
      ),

    /** 头像 */
    avatar: (fieldName = 'avatar', options?: UploadOptions): RequestHandler[] =>
      createUploadMiddleware(
        {
          fields: [{ name: fieldName, maxCount: 1 }],
          limits: { fileSize: 2 * 1024 * 1024 },
        },
        {
          resourceType: 'avatar',
          enableCompression: true,
          compressionOptions: { quality: 80, width: 800, height: 800, format: 'webp' },
          useTempStorage: true,
          autoCleanTemp: true,
          ...options,
        }
      ),
  },
  
  /** 文档上传 */
  document: (fieldName = 'document', maxSizeMB = 50): RequestHandler[] =>
    createUploadMiddleware(
      {
        fields: [{ name: fieldName, maxCount: 1 }],
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
      },
      {
        enableCompression: false,
        useTempStorage: false,
        customFileFilter: (req, file, cb) => {
          const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
          ];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new FileTypeNotAllowedError(file.fieldname, file.originalname, file.mimetype));
          }
        },
      }
    ),

  /** 大文件上传 */
  largeFile: (fieldName = 'file', maxSizeMB = 500): RequestHandler[] =>
    createUploadMiddleware(
      {
        fields: [{ name: fieldName, maxCount: 1 }],
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
      },
      {
        enableCompression: false,
        useTempStorage: true,
        autoCleanTemp: true,
      }
    ),
}

export const uploadErrorHandler = createErrorHandler();
export default upload;