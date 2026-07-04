import { Router } from 'express'
import { ArticleController } from '@/controller/web/Article.controller'
import { SummaryController } from '@/controller/web/Summary.controller'
import { CommentController } from '@/controller/web/Comment.controller'
import { authenticateToken } from '@/middlewares/auth.middleware'
import { zodValidate } from '@/middlewares/zodValidate'
import { 
  ArticleListQuerySchema, ArticleSearchQuerySchema, ArticleShortIdParamSchema, 
  ArticleTimelineListQuerySchema
} from '@/schemas/article/article.web'
import { CommentCreateBodySchema, CommentIdParamSchema, CommentListQuerySchema } from '@/schemas/comment/comment.web.schema'

/** 路由 */
const router: Router = Router()

/** 
 * @description: 搜索文章（依靠MeilisSearch）
 * @route GET /web/article/search
 */
router.get('/search', zodValidate({
  query: ArticleSearchQuerySchema,
}), ArticleController.searchArticles)

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
 * @description: 获取时间线文章列表
 * @route GET /web/article/timeline
 */
router.get('/timeline', zodValidate({
  query: ArticleTimelineListQuerySchema,
}), ArticleController.getArticleTimeline)

/** 
 * @description: 获取随机文章
 * @route GET /web/article/random
 */
router.get('/random', ArticleController.getRandomArticle)

/** 
 * @description: 获取文章详情，通过 shortId 获取文章详情
 * @route GET /web/article/:shortId
*/
router.get('/:shortId', zodValidate({
  params: ArticleShortIdParamSchema,
}), ArticleController.getArticleDetail)

/**
 * @description: 获取某篇文章的评论列表
 * @route GET /web/article/:postId/comment
 */
router.get('/:postId/comment', zodValidate({
  query: CommentListQuerySchema,
}), CommentController.getCommentsByArticleShortId)

/**
 * @description: 给某篇文章发表评论
 * @route POST /web/article/:postId/comment
 */
router.post('/:postId/comment', authenticateToken, zodValidate({
  body: CommentCreateBodySchema,
}), CommentController.createComment)

/**
 * @description: 删除评论
 * @route DELETE /web/article/comment/:id
 */
router.delete('/comment/:id', authenticateToken, zodValidate({
  params: CommentIdParamSchema,
}), CommentController.deleteComment)

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

/** 
 * @description: AI文章评论
 * @route GET /web/article/:shortId/ai-comment
 */
router.get('/:shortId/ai-comment', zodValidate({
  params: ArticleShortIdParamSchema
}), CommentController.aiComment)

export default router