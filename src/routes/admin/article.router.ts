import { Router } from 'express';
import { ArticleController } from '@/controller/admin/Article.controller';
import { upload } from '@/middlewares/upload.middleware';
import { zodValidate } from '@/middlewares/zodValidate';
import {
  ArticleDeleteParamsSchema, ArticleDetailParamsSchema,
  ArticleListQuerySchema, ArticleSearchQuerySchema
} from '@/schemas/article/article.admin';

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
  zodValidate({
    query: ArticleListQuerySchema,
  }),
  ArticleController.getArticleList
);

/** 
 * @description 搜索文章
 * GET /admin/article/search
 */
router.get(
  '/search',
  zodValidate({
    query: ArticleSearchQuerySchema,
  }),
  ArticleController.searchArticles
);

/**
 * @description: 获取文章详情
 * GET /admin/article/:id
 */
router.get(
  '/:id',
  zodValidate({
    params: ArticleDetailParamsSchema,
  }),
  ArticleController.getArticleDetail
);

/**
 * @description: 更新文章
 * PUT /admin/article/:id
 */
// router.put(
//   '/:id',
//   upload.none(),
//   zodValidate({
//     params: ArticleDetailParamsSchema,
//   }),
//   ArticleController.updateArticle
// );

/** 
 * @description: 删除文章
 * DELETE /admin/article/:id
 */
router.delete(
  '/:id',
  zodValidate({
    params: ArticleDeleteParamsSchema,
  }),
  ArticleController.deleteArticle
);

export default router;