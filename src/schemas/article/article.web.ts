import { z } from 'zod'
import {
  ArticleAuthorSchema, ArticleContentSchema, ArticleCoverSchema,
  ArticleDescriptionSchema, ArticleShortIdSchema,
  ArticleThumbCoverSchema,
  ArticleTitleSchema, CategorySchema, TagSchema
} from './article.shared'
import { zDate, zPageNum, zPageSize } from '../base.schema'


/** ---------- 文章类型 ---------- */
/** 文章简要信息 */
export const ArticleBriefSchema = z.object({
  shortId: ArticleShortIdSchema,
  title: ArticleTitleSchema,
  cover: ArticleCoverSchema.nullable(),
  likeCount: z.number().int().min(0).describe("点赞数").optional(),
  tags: z.array(TagSchema).describe("文章标签"),
  categories: z.array(CategorySchema).describe("文章分类"),
  createdAt: zDate,
})

/** 文章详细信息 */
export const ArticleDetailSchema = ArticleBriefSchema.extend({
  author: ArticleAuthorSchema,
  description: ArticleDescriptionSchema.nullable(),
  content: ArticleContentSchema,
})

/** 最近文章信息 */
export const ArticleRecentSchema = z.object({
  shortId: ArticleShortIdSchema,
  title: ArticleTitleSchema,
  thumbCover: ArticleThumbCoverSchema,
  createdAt: zDate,
})

/** ---------- 请求类型 ---------- */
/** 文章 shortID 参数 */
export const ArticleShortIdParamSchema = z.object({
  shortId: ArticleShortIdSchema,
})
/** 获取文章列表参数 */
export const ArticleListQuerySchema = z.object({
  page: zPageNum,
  pageSize: zPageSize,
})


/** ---------- 类型推导 ---------- */
/** 文章简要信息类型 */
export type ArticleBriefVo = z.infer<typeof ArticleBriefSchema>
/** 文章完整信息类型 */
export type ArticleDetailVo = z.infer<typeof ArticleDetailSchema>
/** 最近文章信息类型 */
export type ArticleRecentVo = z.infer<typeof ArticleRecentSchema>



/** 首页文章列表请求参数类型 */
export type ArticleListQueryVo = z.infer<typeof ArticleListQuerySchema>

