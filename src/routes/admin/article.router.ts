import { Router } from 'express';
import { ArticleController } from '@/controller/admin/Article.controller';
import { upload } from '@/middlewares/upload.middleware';

const router: Router = Router();

/**
 * @description: 创建文章
 * POST /admin/article
 */
router.post(
  '/',
  upload.none(),
  ArticleController.createArticle
);
/**
 * @description: 获取文章列表
 * GET /admin/article/
 */
router.get(
  '/',
  ArticleController.getArticleList
);

export default router;