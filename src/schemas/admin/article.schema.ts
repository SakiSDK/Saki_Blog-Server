import { z } from 'zod';
import { zStr, zId, zDateTimeStr } from '../base.schema';


/** ---------- 基础类型 ---------- */
/** 作者结构 */
const AuthorSchema = z.object({
  /** 作者ID */
  id: zId.describe('作者ID'),
  /** 作者昵称 */
  nickname: zStr.describe('作者昵称'),
});

/** 标签结构 */
const TagSchema = z.object({
  /** 标签ID */
  id: zId.describe('标签ID'),
  /** 标签名称 */
  name: zStr.describe('标签名称'),
});

/** 分类结构 */
const CategorySchema = z.object({
  /** 分类ID */
  id: zId.describe('分类ID'),
  /** 分类名称 */
  name: zStr.describe('分类名称'),
});

/** 文章状态 */
const ArticleStatusSchema = z.enum(['draft', 'published']).default('draft').describe('文章状态');

/** 文章基本信息 */
const ArticleSchema = z.object({
  id: zId.describe("文章ID"),
  shortId: zStr.length(6, "短 ID 长度必须是 6 位").describe("文章短 ID"),
  title: zStr.max(255, "标题字数最多位 255 位").describe("文章标题"),
  priority: z.number().int().min(0, "优先级必须大于等于 0").describe("文章优先级"),
  thumbCover: zStr.max(255, "封面图片 URL 字数最多位 255 位").describe("文章封面缩略图片 URL"),
  author: zStr.max(32, "作者字数最多位 32 位").describe("文章作者"),
  allowComment: z.boolean().describe("是否允许评论"),
  createdAt: z.date().describe("创建时间"),
})

/** 文章详细信息 */
const ArticleDetailSchema = ArticleSchema.extend({
  author: AuthorSchema.describe("文章作者"),
  tags: z.array(TagSchema).describe("文章标签"),
  categories: z.array(CategorySchema).describe("文章分类"),
  cover: zStr.max(255, "封面图片 URL 字数最多位 255 位").describe("文章封面图片 URL"),
  description: zStr.max(255, "简介字数最多位 255 位").describe("文章简介"),
  content: zStr.describe("文章内容"),
})


/** ---------- 参数类型 ---------- */
/** 文章列表参数 */
export const ArticleListParamsSchema = z.object({
  // ----------- 基础参数 -----------
  id: zId.nullable().optional().describe('文章ID'),
  keyword: zStr.max(50, "搜索关键词不能超过 50 个字符").optional().describe('搜索关键词'),
  status: z.enum(['publish', 'draft']).default('publish').describe('文章状态'),
  // ----------- 分页参数 -----------
  page: z.number().int().min(1, "页码必须大于等于 1").describe("页码"),
  pageSize: z.number().int().min(1, "每页数量必须大于等于 1").describe("每页数量"),
  // ----------- 排序参数 -----------
  sort: z.enum(['asc', 'desc']).default('desc').describe("排序方式"),
  orderBy: z.enum(['id', 'priority', 'createdAt']).default('id').describe('排序字段'),
  // ----------- 时间参数 -----------
  createdFrom: zDateTimeStr.optional().describe("创建开始时间"),
  createdTo: zDateTimeStr.optional().describe("创建结束时间"),
})

/** 创建文章请求体 */
export const ArticleCreateBodySchema = z.object({
  /** 作者 ID */
  authorId: zStr.length(6, '用户短 ID 必须为 6 个字符').describe('用户短 ID'),
  /** 文章标题 */
  title: zStr.min(1).max(255).describe('文章标题'),
  /** 文章描述 */
  description: zStr.max(255).optional().describe('文章描述'),
  /** 文章状态 */
  status: z.enum(['draft', 'published']).default('draft'),
  /** 文章分类ID */
  categories: z.array(zId)
    .max(3, '最多允许添加 3 个分类')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 3, '最多允许添加 3 个分类')
    .refine(ids => ids.every(id => id > 0), '分类 ID 不能小于 1')
    .describe('文章分类ID列表'),
  /** 文章标签ID列表 */
  tags: z.array(zId)
    .max(10, '最多允许添加 10 个标签')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 10, '最多允许添加 10 个标签')
    .refine(ids => ids.every(id => id > 0), '标签 ID 不能小于 1')
    .optional()
    .describe('文章标签ID列表'),
  /** 是否允许评论 */
  allowComment: z.boolean().default(true).describe('是否允许评论'),
  /** 封面图片 */
  coverPath: zStr.optional().describe('封面图片'),
  /** 优先级 */
  priority: z.number().int().min(0).max(100).default(0).describe('优先级'),
  /** 文章内容 */
  content: zStr.describe('文章内容'),
  /** 文章内图片 */
  imagePaths: z.array(zStr).optional().describe('文章内图片'),
})

/** ---------- 类型推导 ---------- */
/** 文章信息（简要） */
export type ArticleBrief = z.infer<typeof ArticleSchema>;
/** 文章信息（完整） */
export type ArticleFull = z.infer<typeof ArticleDetailSchema>;
/** 文章状态 */
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

/** 文章列表参数类型 */
export type ArticleListParams = z.infer<typeof ArticleListParamsSchema>;
/** 创建文章请求体类型 */
export type ArticleCreateBody = z.infer<typeof ArticleCreateBodySchema>;
