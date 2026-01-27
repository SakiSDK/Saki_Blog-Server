import { ArticlePayload, ArticleService } from '@/services/Article.service';
import { Request, Response } from 'express';
import camelcaseKeys from 'camelcase-keys';


export class ArticleController {
  public static async createArticle(req: Request, res: Response) {
    try {
      const {
        authorId,
        title,
        description,
        status,
        content,
        categories,
        tags,
        coverPath,
        imagePaths,
      } = req.body;

      const payload: ArticlePayload = {
        title,
        description,
        status,
        content,
        categories,
        tags,
        cover_path: coverPath,
        image_paths: imagePaths,
      };

      const article = await ArticleService.createArticle(payload);

      res.status(201).json({
        code: 201,
        message: '文章创建成功',
        success: true,
        data: camelcaseKeys(article.toJSON(), { deep: true }),
      });
    } catch (error: any) {
      console.error('创建文章失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '创建文章失败',
        success: false,
        data: null,
      });
    }
  }
}