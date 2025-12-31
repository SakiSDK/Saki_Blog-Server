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
/** 从文件扩展名获取 MIME 类型 */
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

/** 检查文件扩展名是否在允许列表中 */
const isExtAllowed = (ext: string): boolean => {
  return config.upload.allowedExtensions.includes(ext.toLowerCase());
}

/** 检查 MIME 是否合法（服务端二次校验） */
const isMimeTypeAllowed = (mimeType: string): boolean => {
  return config.upload.allowedMimeTypes.includes(mimeType);
}

/** 检查文件大小是否合法（服务端二次校验） */
const isFileSizeAllowed = (size: number): boolean => {
  return size <= config.upload.maxFileSize;
}

/** 检查文件数量是否合法（服务端二次校验） */
const isFileCountAllowed = (count: number): boolean => {
  return count <= config.upload.maxFileCount;
}

/** 清理原始文件名，防止 ../ 或特殊字符 */ 
const sanitizeFilename = (filename: string): string => {
  return basename(filename)
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_') // 只保留安全字符
    .trim()
    .substring(0, 255); // 防止超长文件名
};

/** 生成安全的文件名 */
const generateSafeFilename = (
  originalName: string,
  strategy: FilenameStrategy,
  useHash = false
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

 /** 格式化文件大小 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/** 确保文件夹存在，不存在则创建 */
const ensureDirExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.promises.access(dirPath);
  } catch (error) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
};

/** 获取图片信息 */
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
 * 压缩图片
 * @param buffer 原始图片 Buffer 数据
 * @param options 缩略图配置项
 * @returns 压缩后的图片 Buffer
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
 * 生成图片缩略图
 * @param buffer 原始图片 Buffer 数据
 * @param options 缩略图配置项
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

export {
  // 文件相关函数
  generateSafeFilename,
  ensureDirExists,
  formatFileSize,
  isExtAllowed,
  isMimeTypeAllowed,
  isFileSizeAllowed,
  isFileCountAllowed,
  sanitizeFilename,
  generateFileUrl,
  getMimeTypeFromExt,
  // 图片相关函数
  getImageInfo,
  generateThumbnail,
  compressImage,
}