import { ArticleService } from '@/services/Article.service';
import { Request, Response } from 'express';

/** ---------- 主函数 ---------- */
export class ArticleController {
  /** 
   * 获取文章列表
   * @route GET /web/article/
   */
  public static async getArticleList(req: Request, res: Response) { 
    try {
      const query = req.query;
      const { list, pagination } = await ArticleService.getArticleListForWeb(query);
      res.status(200).json({
        code: 200,
        message: '文章列表获取成功',
        success: true,
        data: {
          list,
          pagination: {
            ...pagination,
            hasPrev: pagination.page > 1,
            hasNext: pagination.page < pagination.totalPages,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        success: false,
      });
    }
  }
  /**
   * 获取文章详情，通过 shortId 获取文章详情
   * @route GET /web/article/:shortId
   */
  public static async getArticleDetail(req: Request, res: Response) {
    try {
      const shortId = req.params.shortId as string;
      const article = await ArticleService.getArticleDetail(shortId);
      res.status(200).json({
        code: 200,
        message: '文章详情获取成功',
        success: true,
        data: article,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        success: false,
      });
    }
  }
  /** 
   * 获取最近文章列表
   * @route GET /web/article/recent
   */
  public static async getLatestArticles(req: Request, res: Response) {
    try {
      const articles = await ArticleService.getLatestArticles();
      res.status(200).json({
        code: 200,
        message: '最近文章列表获取成功',
        success: true,
        data: articles,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        success: false,
      });
    }
  }
}