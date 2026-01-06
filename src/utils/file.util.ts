import { config } from '@/config';
import sizeOf from 'image-size';
import sharp, { ResizeOptions } from 'sharp';
import { createHash, randomUUID } from 'crypto';
import path, { basename } from 'path';
import fs from 'fs';


// ========================= 类型定义 ========================
/** ---------- 自定义错误类型 ---------- */
export class FileError extends Error {
  constructor(
    message: string
  ) {
    super(message);
    this.name = 'FileError';
  }
}
export class FileTooLargeError extends FileError {
  constructor(message: string) {
    super(message);
    this.name = 'FileTooLargeError';
  }
}
export class FileTypeError extends FileError {
  constructor(message: string) {
    super(message);
    this.name = 'FileTypeError';
  }
}
export class FileTooSmallError extends FileError {
  constructor(message: string) {
    super(message);
    this.name = 'FileTooSmallError';
  }
}

/** ---------- 类型定义 ---------- */
/** 文件名生成策略类型 */
export type FilenameStrategy = 'uuid' | 'timestamp' | 'original';

/** 压缩图片配置项类型 */
export interface CompressOptions {
  /** 缩略图宽度 */
  width?: number;
  /** 缩略图高度 */
  height?: number;
  /** 缩放模式 */
  fit?: ResizeOptions['fit'];
  /** 缩放位置 */
  position?: ResizeOptions['position'];
  /** 压缩质量（0-100） */
  quality?: number;
  /** 压缩效率（0-10） */
  effort?: number;
  /** 是否无损压缩 */
  lossless?: boolean;
  /** 色度子采样 */
  chromaSubsampling?: '4:4:4' | '4:2:0' | '4:2:2';
  /** 压缩格式 */
  format?: 'webp' | 'avif';
}


// ========================= 文件和图片相关函数 ========================
/**
 * 根据文件扩展名获取对应的 MIME 类型
 * @param ext 文件扩展名（如 '.jpg', '.png'），需带点
 * @returns 对应的 MIME 类型字符串，若未知则返回 null
 * @example
 * getMimeTypeFromExt('.png') // => 'image/png'
 */
const getMimeTypeFromExt = (ext: string): string | null => { 
  /** 从文件扩展名获取 MIME 类型 */
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
  };
  return map[ext.toLowerCase()] || null;
}

/**
 * 检查文件扩展名是否在系统允许的白名单中
 * @param ext 文件扩展名（如 '.jpg'）
 * @returns 是否允许
 */
const isExtAllowed = (ext: string): boolean => {
  return config.upload.allowedExtensions.includes(ext.toLowerCase());
}

/**
 * 检查文件扩展名是否在系统允许的白名单中
 * @param ext 文件扩展名（如 '.jpg'）
 * @returns 是否允许
 */
const isImageTypeAllowed = (mimeType: string): boolean => {
  return config.upload.allowedImageTypes.includes(mimeType);
}
/**
 * 检查文件 MIME 类型是否被系统允许（图片或文档等）
 * @param mimeType 文件的 MIME 类型
 * @returns 是否允许
 */
export const isFileTypeAllowed = (mimeType: string): boolean => {
  return config.upload.allowedFileTypes.includes(mimeType);
}

/**
 * 检查文件大小是否在允许范围内（服务端二次校验）
 * @param size 文件大小（字节）
 * @returns 是否未超过最大限制
 */
const isFileSizeAllowed = (size: number): boolean => {
  return size <= config.upload.maxFileSize;
}

/**
 * 检查上传文件数量是否在允许范围内
 * @param count 文件数量
 * @returns 是否未超过最大数量
 */
const isFileCountAllowed = (count: number): boolean => {
  return count <= config.upload.maxFileCount;
}

/**
 * 清理原始文件名，防止路径穿越（如 '../'）或特殊字符注入
 * @param filename 原始文件名
 * @returns 安全的文件名（仅包含字母、数字、点、下划线、连字符、括号、空格）
 * @note 最大长度限制为 255 字符以兼容大多数文件系统
 */
const sanitizeFilename = (filename: string): string => {
  return basename(filename)
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_') // 只保留安全字符
    .trim()
    .substring(0, 255); // 防止超长文件名
};

/** 
 * 生成安全的文件名 
 * @description 默认使用 UUID 生成文件名
 * @param originalName 原始文件名
 * @param strategy 文件名生成策略
 * @param useHash 是否使用哈希文件名
 */
const generateSafeFilename = (
  originalName: string,
  strategy: FilenameStrategy = 'uuid',
  useHash: boolean = false
): string => {
  const cleanName = sanitizeFilename(originalName);
  const ext = path.extname(cleanName).toLowerCase();
  let base: string;

  switch (strategy) {
    case 'uuid':
      base = randomUUID();
      break;
    case 'timestamp':
      base = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      break;
    case 'original':
    default:
      base = path.basename(cleanName, ext);
  }

  if (useHash) {
    const hash = createHash('sha256')
      .update(originalName + Date.now() + Math.random())
      .digest('hex')
      .substring(0, 16);
    base = `${base}_${hash}`;
  }

  return `${base}${ext}`;
};

/**
 * 生成文件的公开访问 URL
 * @param filename 文件名（不含路径）
 * @param subdir 子目录（如 'avatars', 'posts/2025/01'）
 * @param baseUrl 基础 URL（默认从环境变量 FILE_BASE_URL 读取，否则用 '/uploads'）
 * @returns 格式化后的 URL 字符串（如 '/uploads/avatars/xxx.png'）
 */
const generateFileUrl = (
  filename: string, 
  subdir?: string,
  baseUrl?: string
): string => {
  const defaultBaseUrl = process.env.FILE_BASE_URL || '/uploads';
  const dir = subdir || config.upload.storageSubdir;
  const urlBase = baseUrl || defaultBaseUrl;
  
  // 清理路径，确保没有重复的斜杠
  const cleanPath = path.posix.join('/', urlBase, dir, filename);
  return cleanPath.replace(/\/+/g, '/');
}

/**
 * 格式化字节数为人类可读单位（B/KB/MB/GB）
 * @param bytes 字节数
 * @returns 格式化字符串，如 "2.34 MB"
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 确保指定目录存在，若不存在则递归创建
 * @param dirPath 目录绝对路径
 * @throws 若创建失败（如权限不足）则抛出错误
 */
const ensureDirExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.promises.access(dirPath);
  } catch (error) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
};

/**
 * 根据日期生成年/月结构的子目录（用于按时间归档）
 * @param date 日期对象，默认当前时间
 * @returns 格式如 '2025/01'
 */
const generateDateDir = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
}

/**
 * 从图片 Buffer 中提取尺寸和格式信息
 * @param buffer 图片二进制数据
 * @returns 包含 width, height, type 的对象
 * @throws 若解析失败则抛出 Error
 */
const getImageInfo = async (buffer: Buffer): Promise<{
  width: number;
  height: number;
  type: string;
}> => {
  try {
    const dimensions = sizeOf(buffer);
    return {
      width: dimensions.width || 0,
      height: dimensions.height || 0,
      type: dimensions.type || ''
    }
  } catch (error) {
    throw new Error('图片信息获取失败');
  }
};

/**
 * 压缩图片并转换格式（支持 WebP/AVIF）
 * @param buffer 原始图片 Buffer
 * @param options 压缩配置
 * @returns 压缩后的新 Buffer
 * @throws 若输入无效或处理失败则抛出错误
 */
const compressImage = async (
  buffer: Buffer,
  options: CompressOptions
): Promise<Buffer> => {
    const {
      width,
      height,
      fit = 'cover',
      position = 'center',
      quality = 70,
      effort = 6,
      lossless = false,
      chromaSubsampling = '4:2:0',
      format = 'avif'
    } = options;
    if(!buffer?.length) {
      throw new FileError('图片数据为空');
    }
  try {
    const instance = sharp(buffer);
    if(width && height) {
      instance.resize(width, height, {
        fit,
        position
      });
    }
    switch (format) {
      case 'webp':
        instance.toFormat('webp', {
          quality,
          effort,
          lossless,
          chromaSubsampling
        });
        break;
      case 'avif':
        instance.toFormat('avif', {
          quality,
          effort,
          lossless,
          chromaSubsampling
        });
        break;
      default:
    }
    return await instance.toBuffer();
  } catch (error) {
    throw error;
  }
}

/**
 * 生成图片缩略图（默认 400x400，适合列表展示）
 * @param buffer 原始图片 Buffer
 * @param options 缩略图配置（覆盖默认值）
 * @returns 缩略图 Buffer
 */
const generateThumbnail = async(
  buffer: Buffer,
  options: CompressOptions
): Promise<Buffer> => {
  const {
    width = 400,
    height = 400,
    fit = 'contain',
    position = 'center',
    quality = 70,
    effort = 6,
    lossless = false,
    chromaSubsampling = '4:2:0',
    format = 'avif'
  } = options;
  return compressImage(buffer, {
    width,
    height,
    fit,
    position,
    quality,
    effort,
    lossless,
    chromaSubsampling,
    format
  });
}

/**
 * 提取 Multer 文件对象的关键信息
 * @param file Express.Multer.File 对象
 * @returns 标准化后的文件信息对象
 */
const getFileInfo = (file: Express.Multer.File) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
    extension: path.extname(file.originalname).toLowerCase()
  };
};

/**
 * 根据本地文件路径生成 Web 可访问的 URL
 * @param filePath 文件绝对路径
 * @param isTemp 是否来自临时目录（影响 URL 前缀）
 * @returns 公开 URL（如 '/uploads/posts/2025/01/xxx.avif'）
 * @note 要求 Express 已配置静态资源路由指向 uploads 目录
 */
const generateUrlFromPath = (filePath: string, isTemp: boolean = false): string => {
  const rootPath = isTemp && config.upload.tempDir ? config.upload.tempDir : config.upload.rootPath;
  const baseUrl = process.env.FILE_BASE_URL || '/uploads';
  
  // 计算相对路径
  let relativePath = path.relative(rootPath, filePath);
  
  // 如果是临时文件，可能需要特殊的前缀，或者假设临时文件也在 uploads 目录下但不同子目录
  // 这里假设所有 web 可访问文件都挂载在 baseUrl 下
  // 如果临时目录不在 web 根目录下，这个 URL 可能无法访问（除非有专门的路由处理临时文件）
  
  // 统一路径分隔符
  const urlPath = relativePath.split(path.sep).join('/');
  
  return path.posix.join(baseUrl, isTemp ? 'temp' : '', urlPath).replace(/\/+/g, '/');
};

/**
 * 根据临时文件路径生成正式存储路径
 * @param tempPath 临时文件绝对路径
 * @param resourceId 关联的资源 ID（如文章 ID、用户 ID）
 * @param type 资源类型，决定目录结构
 * @returns 正式存储的绝对路径
 */
const getPermanentPathFromTemp = (
  tempPath: string, 
  resourceId: string, 
  type: 'post' | 'avatar' | 'other' = 'other'
): string => {
  const filename = path.basename(tempPath);
  let subdir = '';
  
  // 根据类型决定目录结构
  switch(type) {
    case 'post':
      // 文章图片通常按文章ID或日期存储
      // 这里简单起见，使用日期/文章ID
      subdir = `posts/${generateDateDir()}/${resourceId}`;
      break;
    case 'avatar':
      subdir = `avatars/${resourceId}`;
      break;
    default:
      subdir = `others/${generateDateDir()}`;
  }
  
  return path.join(config.upload.rootPath, subdir, filename);
};

/**
 * 将编辑会话中的临时文件批量移动到正式存储目录
 * @param editSessionId 编辑会话 ID（用于定位临时目录）
 * @param resourceId 最终关联的资源 ID（如文章 ID）
 * @param type 资源类型
 * @param options 高级选项
 * @returns 每个文件的迁移结果数组
 * @example
 * const results = await moveTempToPermanent('sess_123', 'post_456', 'post');
 */
const moveTempToPermanent = async (
  editSessionId: string,
  resourceId: string,
  type: 'post' | 'avatar' | 'other',
  options?: {
    baseUrl?: string,
    keepOriginals?: boolean
  }
): Promise<Array<{
  success: boolean,
  originalPath: string,
  newPath: string,
  url: string,
  error?: string
}>> => {
  if (!config.upload.tempDir) {
    throw new Error('未配置临时目录');
  }

  // 根据资源类型构建临时子目录路径，需与 upload.middleware.ts 中的 generateStorageSubdir 逻辑保持一致
  let tempSubdir = '';
  switch (type) {
    case 'post':
      tempSubdir = `temp/posts/editing/${editSessionId}`;
      break;
    case 'avatar':
      tempSubdir = `temp/avatars/editing/${editSessionId}`;
      break;
    default:
      tempSubdir = `temp/others/editing/${editSessionId}`;
  }

  const tempDir = path.join(config.upload.tempDir, tempSubdir);
  
  // 检查目录是否存在
  try {
    await fs.promises.access(tempDir);
  } catch {
    return []; // 目录不存在，没有文件需要移动
  }

  const files = await fs.promises.readdir(tempDir);
  const results = [];

  for (const file of files) {
    const tempFilePath = path.join(tempDir, file);
    // 忽略目录
    const stat = await fs.promises.stat(tempFilePath);
    if (stat.isDirectory()) continue;

    const permanentPath = getPermanentPathFromTemp(tempFilePath, resourceId, type);
    
    try {
      // 确保目标目录存在
      await ensureDirExists(path.dirname(permanentPath));
      
      // 移动或复制
      if (options?.keepOriginals) {
        await fs.promises.copyFile(tempFilePath, permanentPath);
      } else {
        await fs.promises.rename(tempFilePath, permanentPath);
      }
      
      const url = generateUrlFromPath(permanentPath, false);
      
      results.push({
        success: true,
        originalPath: tempFilePath,
        newPath: permanentPath,
        url
      });
    } catch (error) {
      results.push({
        success: false,
        originalPath: tempFilePath,
        newPath: permanentPath,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 如果不保留原文件，且目录为空，尝试删除临时目录
  if (!options?.keepOriginals) {
    try {
      const remaining = await fs.promises.readdir(tempDir);
      if (remaining.length === 0) {
        await fs.promises.rmdir(tempDir);
      }
    } catch (e) {
      // 忽略删除目录错误
    }
  }

  return results;
};

export {
  // 文件相关函数
  generateSafeFilename,
  ensureDirExists,
  formatFileSize,
  isExtAllowed,
  isImageTypeAllowed,
  isFileSizeAllowed,
  isFileCountAllowed,
  sanitizeFilename,
  generateFileUrl,
  getMimeTypeFromExt,
  generateDateDir,
  // 图片相关函数
  getImageInfo,
  generateThumbnail,
  compressImage,
  // 新增辅助函数
  getFileInfo,
  generateUrlFromPath,
  getPermanentPathFromTemp,
  moveTempToPermanent
}
