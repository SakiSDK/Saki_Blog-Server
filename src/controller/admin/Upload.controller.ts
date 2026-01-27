import { Request, Response, NextFunction } from 'express';
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
      const { filename } = req.params;
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
}