import { z } from 'zod';
import { zId, zPageNum, zPageSize, zStartDate, zEndDate, zSearchKeyword } from '../base.schema';
import {
  ArticleAuthorSchema, ArticleAuthorShortIdSchema, ArticleBaseSchema,
  ArticleContentSchema, ArticleCoverPathSchema, ArticleCoverSchema,
  ArticleCreatedFromSchema, ArticleCreatedToSchema, ArticleDescriptionSchema,
  ArticleIdSchema, ArticleImagePathsSchema, ArticleOrderBySchema,
  ArticlePrioritySchema, ArticleShortIdSchema, ArticleSortSchema,
  ArticleStatusSchema, CategorySchema, TagSchema
} from './article.shared';


/** ---------- 文章类型 ---------- */
/** 文章简要信息 */
export const ArticleBriefSchema =ArticleBaseSchema.extend({
  id: ArticleIdSchema,
  shortId: ArticleShortIdSchema,
})

/** 文章详细信息 */
export const ArticleDetailSchema = ArticleBriefSchema.extend({
  tags: z.array(TagSchema).describe("文章标签"),
  categories: z.array(CategorySchema).describe("文章分类"),
  cover: ArticleCoverSchema,
  description: ArticleDescriptionSchema.optional().nullable(),
  content: ArticleContentSchema,
});

/** ---------- 参数类型 ---------- */
/** 文章列表参数 */
export const ArticleListQuerySchema = z.object({
  page: zPageNum,
  pageSize: zPageSize,
  sort: ArticleSortSchema,
  orderBy: ArticleOrderBySchema,
})

/** 搜索文章请求 */
export const ArticleSearchQuerySchema = ArticleListQuerySchema.extend({
  author: ArticleAuthorSchema.optional(),
  keyword: zSearchKeyword.optional(),
  status: ArticleStatusSchema.optional(),
  createdFrom: zStartDate.optional(),
  createdTo: zEndDate.optional(),
})

/** 创建文章请求体 */
// export const ArticleCreateBodySchema = z.object({
//   authorId: ArticleAuthorShortIdSchema,
//   description: ArticleDescriptionSchema.optional().nullable(),
//   status: ArticleStatusSchema,
//   categories: z.array(zId)
//     .max(3, '最多允许添加 3 个分类')
//     .transform(ids => [...new Set(ids)]) // 自动去重
//     .refine(ids => ids.length <= 3, '最多允许添加 3 个分类')
//     .refine(ids => ids.every(id => id > 0), '分类 ID 不能小于 1')
//     .describe('文章分类ID列表'),
//   tags: z.array(zId)
//     .max(10, '最多允许添加 10 个标签')
//     .transform(ids => [...new Set(ids)]) // 自动去重
//     .refine(ids => ids.length <= 10, '最多允许添加 10 个标签')
//     .refine(ids => ids.every(id => id > 0), '标签 ID 不能小于 1')
//     .optional()
//     .describe('文章标签ID列表'),
//   coverPath: ArticleCoverPathSchema.optional().nullable(),
//   priority: ArticlePrioritySchema,
//   content: ArticleContentSchema,
//   imagePaths: ArticleImagePathsSchema,
// }).merge(ArticleBaseSchema.pick({
//   title: true,
//   allowComment: true
// }))

export const ArticleCreateBodySchema = ArticleBaseSchema.pick({
  title: true,
  allowComment: true
}).extend({
  authorId: ArticleAuthorShortIdSchema,
  description: ArticleDescriptionSchema.optional().nullable(),
  status: ArticleStatusSchema,
  categories: z.array(zId)
    .max(3, '最多允许添加 3 个分类')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 3, '最多允许添加 3 个分类')
    .refine(ids => ids.every(id => id > 0), '分类 ID 不能小于 1')
    .describe('文章分类ID列表'),
  tags: z.array(zId)
    .max(10, '最多允许添加 10 个标签')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 10, '最多允许添加 10 个标签')
    .refine(ids => ids.every(id => id > 0), '标签 ID 不能小于 1')
    .optional()
    .describe('文章标签ID列表'),
  coverPath: ArticleCoverPathSchema.optional().nullable(),
  priority: ArticlePrioritySchema,
  content: ArticleContentSchema,
  imagePaths: ArticleImagePathsSchema,
})




/** 文章 ID 参数 */
export const ArticleIdParamsSchema = z.object({
  /** 文章 ID */
  id: ArticleIdSchema,
})

/** 文章详情参数（复用 ArticleIdParamsSchema） */
export const ArticleDetailParamsSchema = ArticleIdParamsSchema;

/** 删除文章参数验证（复用 ArticleIdParamsSchema） */
export const ArticleDeleteParamsSchema = ArticleIdParamsSchema;

/** ---------- 类型推导 ---------- */
/** 文章信息（简要） */
export type ArticleBrief = z.infer<typeof ArticleBriefSchema>;
/** 文章信息（完整） */
export type ArticleFull = z.infer<typeof ArticleDetailSchema>;
/** 文章状态 */
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

/** 文章列表参数类型 */
export type ArticleListQuery = z.infer<typeof ArticleListQuerySchema>;
/** 创建文章请求体类型 */
export type ArticleCreateBody = z.infer<typeof ArticleCreateBodySchema>;
/** 搜索文章参数类型 */
export type ArticleSearchQuery = z.infer<typeof ArticleSearchQuerySchema>;