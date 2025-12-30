import { Request, Response, NextFunction, RequestHandler } from 'express';
import { upload } from '@/middlewares/upload';
import path from 'path';
import { config } from '@/config';

export const uploadAvatar: RequestHandler[] = [
  ...upload.avatar('avatar'), // ← 展开中间件数组
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.files 是 Multer 注入的
      const file = (req.files as Record<string, Express.Multer.File[]>).avatar?.[0];
      
      if (!file) {
        return res.status(400).json({ error: '未上传文件' });
      }

      // 计算相对路径，以支持嵌套目录（如按日期存储）
      const relativePath = path.relative(config.upload.rootPath, file.path);
      // 统一路径分隔符为 / (兼容 Windows)
      const urlPath = relativePath.split(path.sep).join('/');
      // 构建公开访问 URL（假设静态资源挂载在 /uploads）
      const url = `/uploads/${urlPath}`;

      res.status(201).json({
        code: 201,
        message: '头像上传成功',
        data: {
          url,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    } catch (err) {
      next(err);
    }
  }
];

export const uploadArticleImages: RequestHandler[] = [
  ...upload.articleImages('images'),
  async (req: Request, res: Response, next: NextFunction) => { 
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>).images;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: '未上传图片' });
      }

      const data = files.map(file => {
        const relativePath = path.relative(config.upload.rootPath, file.path);
        const urlPath = relativePath.split(path.sep).join('/');
        return {
          url: `/uploads/${urlPath}`,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        };
      });

      res.status(201).json({
        code: 201,
        message: '文章图片上传成功',
        data
      });
    } catch (err) {
      next(err);
    }
  }
];

export const uploadArticleFile: RequestHandler[] = [
  ...upload.article('file'),
  async (req: Request, res: Response, next: NextFunction) => { 
    try {
      const file = (req.files as Record<string, Express.Multer.File[]>).file?.[0];
      
      if (!file) {
        return res.status(400).json({ error: '未上传文件' });
      }

      const relativePath = path.relative(config.upload.rootPath, file.path);
      const urlPath = relativePath.split(path.sep).join('/');
      const url = `/uploads/${urlPath}`;

      res.status(201).json({
        code: 201,
        message: '文章文件上传成功',
        data: {
          url,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    } catch (err) {
      next(err);
    }
  }
];

