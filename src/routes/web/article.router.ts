import { Router } from 'express'
import { ArticleController } from '@/controller/web/Article.controller'
import { SummaryController } from '@/controller/web/Summary.controller'
import { zodValidate } from '@/middlewares/zodValidate'
import { ArticleListQuerySchema, ArticleShortIdParamSchema } from '@/schemas/article/article.web'

/** 路由 */
const router: Router = Router()


/** 
 * @description: 获取文章列表
 * @route GET /web/article
*/
router.get('/', zodValidate({
  query: ArticleListQuerySchema,
}), ArticleController.getArticleList)

/** 
 * @description: 获取最近文章列表
 * @route GET /web/article/latest
*/
router.get('/latest', ArticleController.getLatestArticles)

/** 
 * @description: 获取文章详情，通过 shortId 获取文章详情
 * @route GET /web/article/:shortId
*/
router.get('/:shortId', zodValidate({
  params: ArticleShortIdParamSchema,
}), ArticleController.getArticleDetail)

/** 
 * @description: 点赞文章
 * @route POST /web/article/:shortId/like
*/
router.post('/:shortId/like', zodValidate({
  params: ArticleShortIdParamSchema,
}), ArticleController.likeArticle)

/** 
 * @description: 根据文章的短ID获取文章摘要（流式返回）
 * @route GET /web/article/:shortId/summary
 */
router.get('/:shortId/summary', zodValidate({
  params: ArticleShortIdParamSchema
}), SummaryController.getArticleSummary)

export default router