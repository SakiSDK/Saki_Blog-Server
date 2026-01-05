import path from 'path';

/** ---------- 上传配置项类型定义 ---------- */
export type FilenameStrategy = 'uuid' | 'timestamp' | 'original';
export interface UploadConfig {
  /** 上传文件存储根路径（绝对路径） */
  rootPath: string
  /** 单文件最大尺寸（字节） */
  maxFileSize: number
  /** 单次上传最大文件数量 */
  maxFileCount: number
  /** 允许的 MIME 类型（服务端校验） */
  allowedMimeTypes: string[]
  /** 允许的文件扩展名（前端校验） */
  allowedExtensions: string[]
  /** 文件名生成策略 */
  filenameStrategy: FilenameStrategy
  /** 临时文件目录 */
  tempDir: string
  /** 是否使用哈希文件名 */
  useHash: boolean
  /** 文件存储子目录规则 */
  storageSubdir: string
  /** 是否启用压缩 */
  enableCompression: boolean
}


/** ---------- 上传配置项 ---------- */
const config: UploadConfig = {
  rootPath: path.resolve(process.env.UPLOAD_PATH || './uploads'),
  maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '5242880', 10),
  maxFileCount: parseInt(process.env.UPLOAD_MAX_FILE_COUNT || '10', 10),
  allowedMimeTypes: (
    process.env.UPLOAD_ALLOWED_MIME_TYPES
    || 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/msword,application/markdown'
  ).split(','),
  allowedExtensions: (
    process.env.UPLOAD_ALLOWED_EXTENSIONS
    || 'jpg,jpeg,png,gif,webp,svg,pdf,md'
  ).split(','),
  filenameStrategy: (
    process.env.UPLOAD_FILENAME_STRATEGY as UploadConfig['filenameStrategy'])
    || 'uuid',
  tempDir: path.resolve(process.env.UPLOAD_TEMP_DIR || './temp'),
  useHash: process.env.UPLOAD_USE_HASH === 'true',
  storageSubdir: process.env.UPLOAD_STORAGE_SUBDIR || 'images',
  enableCompression: process.env.UPLOAD_ENABLE_COMPRESSION === 'true',
}

export default Object.freeze(config);
