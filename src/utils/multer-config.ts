import multer, { FileFilterCallback, StorageEngine } from 'multer'
import { Request, RequestHandler } from 'express';
import { BadRequestError } from './errors';
import { config } from '../config';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

/** ---------- 类型定义 ---------- */
//文件类型
export type FileType = 'images' | 'content' | 'cover' | 'avatar'

/**
 * multer 文件上传配置模块
 * 核心功能：
 * 1. 区分「草稿/发布」状态的文件存储（临时目录/正式目录）
 * 2. 区分文件类型（文章封面、文章内容、文章内图片、用户头像）的存储路径
 * 3. 统一文件过滤（格式/大小/数量限制）、命名规则、目录初始化
 * 4. 提供临时文件→正式文件迁移能力（草稿发布时使用）
 * 5. 统一上传错误处理（文件过大、类型不允许等）
 */

// ========================= 基础配置常量（优先读取全局配置，无则用默认值）=========================
/**
 * @description 允许的图片MIME类型（用于封面、文章内图片、头像等）
 * @description 优先级：全局配置 config.upload.allowedImageTypes → 默认值（常见图片格式）
 */
const ALLOWED_IMAGE_MINE_TYPES = config.upload?.allowedImageTypes || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif'
]


/**
 * @description 允许的文章内容文件类型（仅支持markdown，用于文章草稿/发布的内容文件）
 * @description 优先级：全局配置 config.upload.allowedArticleTypes → 默认值（markdown）
 */
const ALLOWED_ARTICLE_TYPES = config.upload.allowedArticleTypes || [
    'article/markdown'
]


/**
 * @description 单文件大小限制（默认10MB）
 * @description 优先级：全局配置 config.upload.maxFileSize → 默认值 10*1024*1024（10MB）
 */
const MAX_FILE_SIZE = Number(config.upload.maxFileSize) || 10 * 1024 * 1024 // 10MB


/**
 * @description 图片上传数量限制（默认最多20张，用于文章内多图上传）
 * @description 优先级：全局配置 config.upload.maxImageCount → 默认值 20
 */
const MAX_IMAGE_COUNT = Number(config.upload.maxImageCount) || 20  


// ========================= 存储路径配置（区分「正式目录」和「临时目录」）=========================
/**
 * @description 正式文件存储路径（发布状态的文件，永久存储）
 * @description 按文件用途分类：文章封面、文章内容、文章内图片、用户头像
 */
export const storagePaths = {
    // 文章封面图路径
    cover: path.join(__dirname, '../../public/uploads/articles/covers'),
    // 文章内容文件路径
    content: path.join(__dirname, '../../public/uploads/articles/contents'),
    // 文章内图片路径
    images: path.join(__dirname, '../../public/uploads/articles/images'),
    // 用户头像路径
    avatar: path.join(__dirname, '../../public/uploads/avatars'),
}

/**
 * @description 临时文件存储路径（草稿状态的文件，仅临时存储，发布后迁移到正式目录）
 * @description 与正式目录结构一一对应，避免路径混乱
 */
export const tempStoragePaths = {
    cover: path.join(__dirname, '../../public/uploads/temp/covers'),
    content: path.join(__dirname, '../../public/uploads/temp/contents'),
    images: path.join(__dirname, '../../public/uploads/temp/images'),
    avatar: path.join(__dirname, '../../public/uploads/temp/avatars'),
}


// ========================= 目录初始化工具函数（确保上传目录存在，避免报错）=========================
/**
 * 确保单个目录存在，不存在则递归创建
 * @param directory 目录路径
 */
const ensureDirectoryExists = async (directory: string) => {
    try {
        await fs.accessSync(directory);
    } catch {
        await fs.mkdirSync(directory, { recursive: true });
    }
}


/**
 * 初始化所有正式存储目录（项目启动时执行，确保上传目录就绪）
 */
const initializeStorageDirectories = async () => {
    try {
        await Promise.all(
            Object.values(storagePaths).map(async (directory) => {
                await ensureDirectoryExists(directory);
            })
        );
    } catch (error) {
        console.error('[multerConfig: initializeStorageDirectories]初始化磁盘存储目录失败:', error);
        throw new Error('文件上传初始化失败')
    }
}


/**
 * 初始化所有临时存储目录（项目启动时执行，确保草稿文件可上传）
 */
const initializeTempStorage = async () => {
    try {
        await Promise.all(
            Object.values(tempStoragePaths).map(async (directory) => {
                await ensureDirectoryExists(directory);
            })
        );
    } catch (error) {
        console.error('[multerConfig: initializeStorageDirectories]初始化磁盘存储目录失败:', error);
        throw new Error('文件上传初始化失败')
    }
}


// 项目启动时自动执行目录初始化（确保服务启动后即可支持上传）
initializeStorageDirectories();
initializeTempStorage();


// ========================= 通用存储配置生成器（统一文件名和存储路径逻辑）=========================
/**
 * 创建磁盘存储配置（multer.diskStorage）
 * @description 作用：统一处理「存储路径」和「文件名生成」，避免重复代码
 * @param dest 目标存储目录（正式/临时目录，由调用方传入）
 * @returns multer 可用的 StorageEngine 实例
 */
export const createDiskStorage = (dest: string): StorageEngine => {
    return multer.diskStorage({
        destination: async (req, file, cb) => {
            try {
                await ensureDirectoryExists(dest);
                cb(null, dest);
            } catch (error) {
                cb(error as Error, '');
            }
        },
        filename: (req, file, cb) => {
            try {
                // 动态生成唯一文件名，保留原扩展名
                const ext = path.extname(file.originalname).toLowerCase() || '';
                const fileName = `${randomUUID()}${ext}`;
                cb(null, fileName);
            } catch (err) {
                cb(err instanceof Error ? err : new Error(String(err)), '');
            }
        }
    })
}


// ========================= 通用文件过滤函数生成器（统一格式校验逻辑）=========================
/**
 * 创建文件过滤函数（校验文件类型是否允许）
 * @description 作用：根据不同文件用途（图片/文章）生成对应的过滤规则，复用逻辑
 * @param allowedTypes 允许的MIME类型数组
 * @param errorMessage 类型不允许时的错误提示
 * @returns multer 可用的 FileFilterCallback 函数
 */
const createFileFilter = (allowedTypes: string[], errorMessage: string) => {
    return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestError(`${errorMessage}: 不支持的文件类型${file.mimetype}`))
        }
    }
}


// ========================= 专用上传器配置（针对特定业务场景）=========================
const albumImageFilter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '只允许上传图片');
const avatarImageFilter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '头像上传失败');
const articleCoverFilter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '封面上传失败');
/**
 * 相册图片上传配置（内存存储）
 * @description 用途：相册功能上传图片（后续可能上传到OSS，暂存内存更高效）
 * @description 特性：仅允许图片格式、单文件10MB、最多20张
 */
export const albumImageUploader = multer({
    storage: multer.memoryStorage(),
    fileFilter: albumImageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_IMAGE_COUNT,
    }
})
/**
 * 头像专用上传配置（磁盘存储）
 * @description 用途：用户中心-头像设置/更新（单独配置，便于维护和扩展）
 * @description 特性：1. 仅允许图片格式（JPG/PNG/GIF/WebP/SVG）；2. 单文件限制5MB（比文章图片更严格，优化存储）；
 * @description 特性：3. 直接存储到正式目录（头像无草稿状态）；4. 仅支持单文件上传（一次更换一张头像）
 */
export const avatarUploader = multer({
    storage: multer.memoryStorage(), // 存储到用户头像专属正式目录
    fileFilter: avatarImageFilter, // 仅允许图片格式
    limits: {
        fileSize: MAX_FILE_SIZE, // 头像单独限制5MB（避免大文件占用存储）
        files: 1, // 强制单文件上传（一次只能更换一张头像）
    }
})

/**
 * 文章封面专用上传配置 （内存存储）
 * @description 用途：文章封面上传
 * @description 特性：1. 仅允许图片格式（JPG/PNG/GIF/WebP/SVG/AVIF）；2. 单文件限制10MB（避免大文件占用存储）；3. 存储到临时目录（草稿状态）
 */
export const coverUploader = multer({
    storage: multer.memoryStorage(),
    fileFilter: articleCoverFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    }
})



/**
 * 通用上传器生成器（核心函数）
 * @description 作用：根据「文件状态（草稿/发布）」和「文件类型」动态生成上传配置
 * @description 支持：单文件上传（封面/文章内容）、多文件上传（文章内图片）
 * @param status 文件状态：draft（草稿）→ 存临时目录；published（发布）→ 存正式目录
 * @param fileType 文件类型：images（文章内图片）、content（文章内容）、cover（文章封面）
 * @returns multer 上传中间件（RequestHandler）
 */
export const createUploader = (status: 'draft' | 'published', fileType: FileType): RequestHandler => {
    let storage: StorageEngine | null = null
    let baseDir: string | null = null
    let filter = null;
    if (status === 'draft') {
        baseDir = tempStoragePaths[fileType]
    } else {
        baseDir = storagePaths[fileType];
    }
    console.log('[multerConfig: createUploader]生成上传器:', baseDir)
    storage = createDiskStorage(baseDir);
    switch (fileType) {
        case 'cover':
            filter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '只许上传图片')
            break;
        case 'images':
            filter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '只允许上传图片')
            break;
        case 'content':
            filter = createFileFilter(ALLOWED_ARTICLE_TYPES, '只允许上传markdown文章')
            break;
        case 'avatar':
            filter = createFileFilter(ALLOWED_IMAGE_MINE_TYPES, '只允许上传图片')
            break;
    }
    const uploadConfig = {
        storage,
        fileFilter: filter,
        limits: {
            fileSize: MAX_FILE_SIZE,
            files: MAX_IMAGE_COUNT,
        }
    }
    return fileType === 'images'
        ? multer(uploadConfig).array('files', 20)
        : multer(uploadConfig).single('file');
}


// ========================= 上传错误处理中间件（统一捕获上传异常）=========================
/**
 * 文件上传错误处理中间件
 * @description 作用：捕获multer上传过程中的所有错误（内置错误+自定义错误），统一返回格式化响应
 * @description 必须放在multer上传中间件之后（express中间件执行顺序：先上传→再处理错误）
 */
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
    console.error('[multerConfig: handleUploadError]文件上传错误:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        field: err.field,
    })
    if (err instanceof multer.MulterError) {
        // Multer内置错误
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    code: 'FILE_TOO_LARGE',
                    message: `文件大小超出限制，请上传更小的文件`
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    code: 'TOO_MANY_FILES',
                    message: `上传文件数量超出限制`
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    code: 'UNEXPECTED_FILE',
                    message: `不允许的文件字段: ${err.field}`
                });
            default:
                return res.status(400).json({
                    code: 'UPLOAD_ERROR',
                    message: `文件上传失败: ${err.message}`
                });
        }
    }
    // 自定义错误
    if (err instanceof BadRequestError) {
        return res.status(400).json({
            code: 'UPLOAD_ERROR',
            message: `文件上传失败: ${err.message}`
        });
    }
    // 未知错误
    next(err)
}


// ========================= 临时文件迁移工具（草稿→发布时使用）=========================
/**
 * 单个临时文件→正式文件迁移（草稿发布时，将临时目录的文件移动到正式目录）
 * @param filePath 临时文件的访问URL（如：http://xxx/temp/images/xxx.png）
 * @param fileType 文件类型（cover/images/content），用于匹配存储路径
 * @returns 迁移后的正式路径（数据库存储用）和公共访问URL（前端展示用）
 */
export const moveTempToFormal = async (filePath: string, fileType: FileType) => {
    const tempPath: string = tempStoragePaths[fileType];
    const formalPath: string = storagePaths[fileType];
    
    try {
        // 1. 从URL中提取文件名
        const urlObj = new URL(filePath);
        const fileName = path.basename(urlObj.pathname);

        // 2. 拼接单个临时文件的完整路径
        const tempFileFullPath = path.join(tempStoragePaths[fileType], fileName);

        // 3. 拼接目标正式文件的完整路径
        const formalDir = storagePaths[fileType];
        const formalFileFullPath = path.join(formalDir, fileName);

        // 4. 确保正式目标存在（防止目标未创建）
        await ensureDirectoryExists(formalDir);

        // 5. 移动单个文件
        await fs.renameSync(tempFileFullPath, formalFileFullPath); // 移动文件

        // 存储到数据库路径和访问URL
        const result = {
            formalPath: `/uploads/articles/${fileType}/${fileName}`, // 存储到数据库的路径
            publicUrl: `${config.serverUrl}/uploads/articles/${fileType}/${fileName}` // 前端访问URL
        }
        console.log(`[][multerConfig: moveTempToFormal]文件迁移成功:`, result);
        return result;
    } catch (error: any) {
        throw new Error(`文件迁移失败：${error.message}`);
    }
};


/**
 * 批量临时文件→正式文件迁移（处理多文件场景，如文章内多张图片）
 * @param filePaths 多个临时文件的访问URL数组
 * @param fileType 文件类型（cover/images/content）
 * @returns 批量迁移后的结果数组（每个元素包含formalPath和publicUrl）
 */
export const bulkMoverTempToFormal = async (filePaths: string[], fileType: FileType) => {
    const results: {
        formalPath: string;
        publicUrl: string;
    }[] = []
    console.log('[multerConfig: bulkMoverTempToFormal]批量迁移文件开始:', filePaths)
    for (const filePath of filePaths) {
        const result = await moveTempToFormal(filePath, fileType);
        results.push(result);
    }
    console.log('[multerConfig: bulkMoverTempToFormal]批量迁移文件结束:', results)
    return results;
}