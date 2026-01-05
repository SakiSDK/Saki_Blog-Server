import { Request, Response, NextFunction, RequestHandler } from 'express';
import { FileUploadError, upload } from '@/middlewares/upload.middleware';
import path from 'path';
import { config } from '@/config';
import { UserService } from '@/services/User.service';
import { isMimeTypeAllowed, formatFileSize, getFileInfo, generateUrlFromPath, getPermanentPathFromTemp, moveTempToPermanent } from '@/utils/file.util';
import multer from 'multer';

/**
 * 文章图片上传处理
 * 用于正式发布文章时的图片上传
 */
export const uploadArticleImage: RequestHandler[] = [
  ...upload.permanent.postImage('image', {
    // 明确指定这是正式上传，不是编辑模式
    isEditing: false,
    // 可以在这里传入资源ID（如文章ID）
    resourceId: (req) => req.params.articleId || req.body.articleId || 'unknown',
    // 确保使用压缩
    enableCompression: true,
    compressionOptions: {
      quality: 85,
      format: 'webp'
    },
    // 确保使用临时存储并自动清理
    useTempStorage: true,
    autoCleanTemp: true,
  }),
  async (req: Request, res: Response) => {
    try {
      // 类型安全的文件获取
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      
      if (!files?.image || files.image.length === 0) {
        // 使用自定义错误类型
        throw new FileUploadError('未上传图片', 'NO_FILE_UPLOADED', 'image');
      }

      const file = files.image[0];
      
      // 验证文件是否安全
      if (!isMimeTypeAllowed(file.mimetype)) {
        throw new FileUploadError('文件安全检查失败', 'FILE_UNSAFE', 'image', file.originalname);
      }

      // 从请求中获取上传信息
      const uploadInfo = (req as any).uploadInfo;
      if (!uploadInfo) {
        console.warn('请求中缺少 uploadInfo，使用备用路径生成方式');
      }

      // 生成URL（优先使用上传信息中的子目录）
      const relativePath = uploadInfo?.subdir 
        ? path.posix.join(uploadInfo.subdir, file.filename)
        : path.relative(config.upload.rootPath, file.path).split(path.sep).join('/');
      
      const baseUrl = process.env.FILE_BASE_URL || '/uploads';
      const url = path.posix.join('/', baseUrl, relativePath).replace(/\/+/g, '/');

      // 构建完整的文件信息
      const fileInfo = {
        ...getFileInfo(file),
        url,
        relativePath,
        uploadType: uploadInfo?.uploadType || 'post',
        resourceId: uploadInfo?.resourceId,
        timestamp: new Date().toISOString()
      };

      // 记录上传日志（可选的）
      console.log(`文章图片上传成功: ${file.originalname} -> ${relativePath}`);

      res.status(201).json({
        code: 201,
        success: true,
        message: '图片上传成功',
        data: {
          ...fileInfo,
          // 保持向后兼容性
          url
        },
        metadata: {
          // 可以提供一些元数据给前端
          canBeReused: true,
          maxSize: formatFileSize(config.upload.maxFileSize),
          allowedTypes: config.upload.allowedMimeTypes.filter(mime => mime.startsWith('image/'))
        }
      });
    } catch (error) {
      console.error("上传文章图片失败：", error);
      
      // 根据错误类型返回不同的状态码
      let statusCode = 500;
      let errorMessage = "上传文章图片失败";
      
      if (error instanceof FileUploadError) {
        switch (error.code) {
          case 'NO_FILE_UPLOADED':
            statusCode = 400;
            errorMessage = error.message;
            break;
          case 'FILE_UNSAFE':
            statusCode = 403;
            errorMessage = error.message;
            break;
          default:
            statusCode = 400;
            errorMessage = error.message;
        }
      } else if (error instanceof multer.MulterError) {
        statusCode = 400;
        errorMessage = `上传错误: ${error.message}`;
      }
      
      res.status(statusCode).json({
        code: statusCode,
        success: false,
        message: errorMessage,
        data: null,
        // 开发环境下提供更多错误信息
        ...(process.env.NODE_ENV === 'development' && { 
          error: error instanceof Error ? error.message : '未知错误'
        })
      });
    }
  }
];

/**
 * 编辑模式文章图片上传（临时存储）
 * 用于编辑文章时的图片上传，文件先存到临时目录
 */
export const uploadArticleImageForEditing: RequestHandler[] = [
  ...upload.editing.postImage('image', {
    // 编辑模式必须设置编辑会话ID
    editSessionId: (req) => req.body.editSessionId || req.query.editSessionId,
    // 编辑模式使用临时存储
    useTempStorage: true,
    // 编辑模式不自动清理，由业务逻辑决定何时清理
    autoCleanTemp: false,
    // 同样进行压缩
    enableCompression: true,
    compressionOptions: {
      quality: 85,
      format: 'webp'
    }
  }),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      
      if (!files?.image || files.image.length === 0) {
        throw new FileUploadError('未上传图片', 'NO_FILE_UPLOADED', 'image');
      }

      const file = files.image[0];
      const uploadInfo = (req as any).uploadInfo;
      
      if (!uploadInfo) {
        throw new FileUploadError('上传信息丢失', 'UPLOAD_INFO_MISSING', 'image', file.originalname);
      }

      // 生成临时访问URL
      const tempUrl = generateUrlFromPath(file.path, true);
      
      // 获取正式路径（用于后续移动文件时使用）
      const permanentPath = uploadInfo.resourceId 
        ? getPermanentPathFromTemp(
            file.path,
            uploadInfo.resourceId,
            'post' as const
          )
        : null;

      const responseData = {
        // 临时文件信息
        tempFile: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          tempUrl,
          // 临时路径信息
          tempPath: file.path,
          permanentPath,
          // 编辑会话信息
          editSessionId: uploadInfo.editSessionId,
          uploadType: uploadInfo.uploadType,
          // 上传时间戳
          uploadedAt: new Date().toISOString()
        },
        // 提供给前端的元信息
        metadata: {
          isTemp: true,
          canBeMoved: true,
          editSessionId: uploadInfo.editSessionId,
          // 临时文件过期时间（24小时）
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      res.status(201).json({
        code: 201,
        success: true,
        message: '图片上传成功（编辑模式）',
        data: responseData
      });
    } catch (error) {
      console.error("编辑模式图片上传失败：", error);
      
      const statusCode = error instanceof FileUploadError ? 400 : 500;
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      
      res.status(statusCode).json({
        code: statusCode,
        success: false,
        message: errorMessage,
        data: null
      });
    }
  }
];

/**
 * 移动编辑图片到正式目录
 * 用于保存草稿或发布文章时，将临时文件移动到正式目录
 */
export const moveEditingImages: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { editSessionId, articleId } = req.body;
    
    if (!editSessionId || !articleId) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '缺少必要参数：editSessionId 和 articleId',
        data: null
      });
    }

    // 移动临时文件到正式目录
    const moveResults = await moveTempToPermanent(
      editSessionId,
      articleId,
      'post',
      {
        baseUrl: process.env.FILE_BASE_URL || '/uploads',
        // 根据操作决定是否保留原文件
        keepOriginals: req.body.action === 'draft'
      }
    );

    // 构建URL映射表（用于替换文章内容中的临时URL）
    const urlMap: Record<string, string> = {};
    moveResults.forEach(result => {
      if (result.success) {
        const tempUrl = generateUrlFromPath(result.originalPath, true);
        urlMap[tempUrl] = result.url;
      }
    });

    const successfulMoves = moveResults.filter(r => r.success);
    const failedMoves = moveResults.filter(r => !r.success);

    res.status(200).json({
      code: 200,
      success: failedMoves.length === 0,
      message: failedMoves.length === 0 
        ? '图片移动完成' 
        : `${successfulMoves.length}个成功，${failedMoves.length}个失败`,
      data: {
        total: moveResults.length,
        successful: successfulMoves.length,
        failed: failedMoves.length,
        results: moveResults,
        urlMap,
        // 提供更新后的文章内容建议
        suggestions: successfulMoves.length > 0 ? {
          urlReplacementNeeded: true,
          oldUrls: Object.keys(urlMap),
          newUrls: Object.values(urlMap)
        } : null
      }
    });
  } catch (error) {
    console.error("移动编辑图片失败：", error);
    
    res.status(500).json({
      code: 500,
      success: false,
      message: error instanceof Error ? error.message : '移动图片失败',
      data: null
    });
  }
};