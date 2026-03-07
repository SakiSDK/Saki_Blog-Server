import { ImageService, ImageRecord } from '@/services/Image.service';
import { PhotoService } from '@/services/Photo.service';
import { ImageScene } from '@/constants/image.scene';
import { Request, Response, NextFunction } from 'express';
import { sequelize } from '@/models';
import path from 'path';
import fs from 'fs';
import { config } from '@/config';
import { 
  getFileInfo, 
  generateUrlFromPath, 
  getPermanentPathFromTemp, 
  ensureDirExists 
} from '@/utils/file.util';


/** 
 * 上传文件
 * @route POST /admin/upload
 * @group admin - 管理员
 * @param {file} file.formData.required - 文件
 */
export class UploadController {
  /** 
   * 上传单个文章图片文件
   * @route POST /admin/upload/article/image
   * @group admin - 管理员
   */
  public static async uploadArticleImage(req: Request, res: Response) {
    // 检查文件是否存在
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '未上传文件',
        data: null
      });
    }

    try {
      // // 获取文件基本信息
      // const fileInfo = getFileInfo(req.file);
      
      // 生成临时预览链接 (isTemp = true)
      const url = generateUrlFromPath(req.file.path, true);

      return res.status(200).json({
        code: 200,
        success: true,
        message: '图片上传成功',
        data: {
          url,
          // 标记为临时文件，前端保存文章时需要将此列表传给 confirmFiles
          isTemp: true
        }
      });
    } catch (error) {
      console.error('Upload article image error:', error);
      return res.status(500).json({
        code: 500,
        success: false,
        message: '图片处理失败',
        data: null
      });
    }
  }

  /** 
   * 上传文章图片文件
   * @route POST /admin/upload/article/cover
   * @group admin - 管理员
   */
  public static async uploadArticleCover(req: Request, res: Response) { 
    // 检查文件是否存在
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '未上传文件',
        data: null
      });
    }
    
    try {
      // 获取文件基本信息
      const fileInfo = getFileInfo(req.file);
      
      // 生成临时预览链接 (isTemp = true)
      const url = generateUrlFromPath(req.file.path, true);

      return res.status(200).json({
        code: 200,
        success: true,
        message: '封面上传成功',
        data: {
          ...fileInfo,
          url,
          // 标记为临时文件，前端保存文章时需要将此列表传给 confirmFiles
          isTemp: true
        }
      });
    } catch (error) {
      console.error('Upload article image error:', error);
      return res.status(500).json({
        code: 500,
        success: false,
        message: '图片处理失败',
        data: null
      });
    }
  }

  /**
   * 上传相册图片
   * @route POST /admin/upload/photo
   * @group admin - 管理员
   */
  public static async uploadAlbumPhotos(req: Request, res: Response) {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '未上传文件',
        data: null
      });
    }

    const files = req.files as Express.Multer.File[];
    const albumId = req.body.albumId ? parseInt(req.body.albumId, 10) : null;
    
    const transaction = await sequelize.transaction();
    const photoService = new PhotoService();

    try {
      // 1. 获取临时文件路径（相对路径）
      const tempPaths = files.map(file => path.relative(config.upload.rootPath, file.path));

      // 2. 批量移动到正式目录
      const formalPaths = await ImageService.copyToFormalDirBatch(tempPaths, ImageScene.PHOTO_IMAGE);

      // 3. 构建 ImageRecord 列表
      const imageRecords: ImageRecord[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formalPath = formalPaths[i];
        
        // 获取图片元数据（宽高等）
        const meta = await ImageService.getImageMetadata(formalPath);

        // 生成缩略图
        try {
          await ImageService.generateThumbnail(formalPath, {
            width: 400,
            height: 400,
            fit: 'cover'
          });
        } catch (error) {
          console.warn(`[Upload] 生成缩略图失败: ${formalPath}`, error);
        }

        imageRecords.push({
          path: formalPath,
          size: meta.size,
          width: meta.width,
          height: meta.height,
          type: file.mimetype,
          storage: 'local',
          uploadedAt: new Date(),
          // userId: (req as any).user?.id // 如果需要记录上传者
        });

        // 删除临时文件
        try {
          await fs.promises.unlink(file.path);
        } catch (e) {
          console.warn(`Failed to delete temp file: ${file.path}`, e);
        }
      }

      // 4. 批量写入数据库
      const images = await ImageService.createImageRecords(imageRecords, transaction);

      // 5. 如果有 albumId，创建 Photo 关联
      if (albumId && !isNaN(albumId)) {
        for (const image of images) {
          // 串行执行以避免并发问题（如同时更新相册封面）
          await photoService.createPhoto(albumId, image.id, null, transaction);
        }
      }

      await transaction.commit();

      return res.status(200).json({
        code: 200,
        success: true,
        message: '相册图片上传成功',
        data: null
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Upload album photos error:', error);
      return res.status(500).json({
        code: 500,
        success: false,
        message: '图片上传处理失败',
        data: null
      });
    }
  }

  /**
   * 确认上传文件 (将临时文件移动到正式目录)
   * 在文章保存/发布时调用
   */
  public static confirmFiles = async (req: Request, res: Response) => {
    const { files, resourceId, type = 'post' } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '文件列表为空',
        data: null
      });
    }

    if (!resourceId) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '缺少资源ID',
        data: null
      });
    }

    const tempDir = config.upload.tempDir || path.resolve('temp_uploads');
    const results = [];

    for (const fileUrlOrName of files) {
      // 从 URL 或文件名中提取文件名
      const filename = path.basename(fileUrlOrName);
      const tempPath = path.join(tempDir, filename);

      try {
        // 检查临时文件是否存在
        await fs.promises.access(tempPath);

        // 计算正式存储路径
        const permanentPath = getPermanentPathFromTemp(tempPath, resourceId, type);
        
        // 确保目标目录存在
        await ensureDirExists(path.dirname(permanentPath));

        // 移动文件
        await fs.promises.rename(tempPath, permanentPath);

        // 生成正式访问 URL
        const newUrl = generateUrlFromPath(permanentPath, false);

        results.push({
          originalName: filename,
          url: newUrl,
          success: true
        });
      } catch (error) {
        // 如果临时文件不存在，可能是已经是正式文件，或者是无效文件
        // 这里尝试检查是否已经是正式文件路径（可选逻辑，视需求而定）
        console.warn(`File confirm failed for ${filename}:`, error);
        results.push({
          originalName: filename,
          success: false,
          error: 'File not found or move failed',
        });
      }
    }

    return res.status(200).json({
      code: 200,
      success: true,
      message: '文件确认完成',
      data: results
    });
  };

  /**
   * 创建删除临时文件的处理器
   * @param subdir 子目录 (例如 'articles/images')
   */
  public static createDeleteHandler = (subdir: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const filename = req.params.filename as string;
      if (!filename) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: 'Invalid filename',
          data: null
        });
      }

      const tempDir = config.upload.tempDir || path.resolve('temp_uploads');
      
      // 安全检查：防止目录遍历
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: 'Invalid filename',
          data: null
        });
      }

      const filePath = path.join(tempDir, subdir, filename);

      try {
        await fs.promises.unlink(filePath);
        return res.status(200).json({
          code: 200,
          success: true,
          message: '临时文件清理完成',
          data: { filename }
        });
      } catch (e: any) {
        // 如果文件不存在，也视为成功（幂等性），避免前端报错
        if (e.code === 'ENOENT') {
          return res.status(200).json({
            code: 200,
            success: true,
            message: '文件不存在或已被删除',
            data: { filename }
          });
        }
        
        console.error(`Failed to delete temporary file: ${filePath}`, e);
        return res.status(500).json({
          code: 500,
          success: false,
          message: '临时文件删除失败',
          data: null
        });
      }
    };
  };

  /**
   * 删除临时文件 (旧接口，仅支持根目录)
   * @deprecated 建议使用 createDeleteHandler
   */
  public static deleteTempFiles = async (req: Request, res: Response) => {
    return UploadController.createDeleteHandler('')(req, res, () => {});
  };

  /** 
   * 上传相册图片
   * @router POST /admin/upload/photo
   */
  public static uploadPhoto = async (req: Request, res: Response) => {
    // 检查文件是否存在
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '未上传文件',
        data: null
      });
    }

    try {
      // 获取文件基本信息
      const fileInfo = getFileInfo(req.file);
      
      // 生成临时预览链接 (isTemp = true)
      const url = generateUrlFromPath(req.file.path, true);

      return res.status(200).json({
        code: 200,
        success: true,
        message: '封面上传成功',
        data: {
          ...fileInfo,
          url,
          // 标记为临时文件，前端保存文章时需要将此列表传给 confirmFiles
          isTemp: true
        }
      });
    } catch (error) {
      console.error('Upload article image error:', error);
      return res.status(500).json({
        code: 500,
        success: false,
        message: '图片处理失败',
        data: null
      });
    }
  }
}