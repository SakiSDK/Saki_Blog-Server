import { Request, Response, NextFunction, RequestHandler } from 'express';
import { upload } from '@/middlewares/upload';
import path from 'path';
import { config } from '@/config';
import { UserService } from '@/services/User.service';

export const uploadAvatar: RequestHandler[] = [
  ...upload.avatar('avatar'), // ← 展开中间件数组
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.files 是 Multer 注入的
      const file = (req.files as Record<string, Express.Multer.File[]>).avatar?.[0];
      const userId = Number(req.query.userId as string);
      
      if (!file) {
        return res.status(400).json({ error: '未上传文件' });
      }

      // 计算相对路径，以支持嵌套目录（如按日期存储）
      const relativePath = path.relative(config.upload.rootPath, file.path);
      // 统一路径分隔符为 / (兼容 Windows)
      const urlPath = relativePath.split(path.sep).join('/');
      // 构建公开访问 URL（假设静态资源挂载在 /uploads）
      const url = `/uploads/${urlPath}`;

      await UserService.updateUserAvatar(userId, url);

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

export const uploadArticleImage: RequestHandler[] = [
  ...upload.articleImages('image'),
  async (req: Request, res: Response) => {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>).image;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: '未上传图片' });
      }

      const file = files[0];
      const relativePath = path.relative(config.upload.rootPath, file.path);
      const urlPath = relativePath.split(path.sep).join('/');
      const url = `/uploads/${urlPath}`;

      res.status(201).json({
        code: 201,
        success: true,
        message: '图片上传成功',
        data: {
          url
        }
      });
    } catch (err) {
      console.error("上传文章图片失败：", err);
      res.status(500).json({
        code: 500,
        success: false,
        message: "上传文章图片失败",
        data: null,
      });
    }
  }
];