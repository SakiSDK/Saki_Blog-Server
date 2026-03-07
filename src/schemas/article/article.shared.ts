import { z } from 'zod';
import { zStr, zId, zBoolean, zDate } from '../base.schema';


/** ---------- 基础类型 ---------- */
/** 作者结构 */
export const AuthorSchema = z.object({
  /** 作者ID */
  id: zId.describe('作者ID'),
  /** 作者昵称 */
  nickname: zStr.describe('作者昵称'),
  /** 作者头像 */
  avatar: zStr.nullable().optional().describe('作者头像'),
});

/** 标签结构 */
export const TagSchema = z.object({
  /** 标签ID */
  id: zId.describe('标签ID'),
  /** 标签名称 */
  name: zStr.describe('标签名称'),
  /** 标签别名 */
  slug: zStr.describe('标签别名'),
});

/** 分类结构 */
export const CategorySchema = z.object({
  /** 分类ID */
  id: zId.describe('分类ID'),
  /** 分类名称 */
  name: zStr.describe('分类名称'),
  /** 分类别名 */
  slug: zStr.describe('分类别名'),
});


/** ---------- 文章字段 ---------- */
/** 文章 id */
export const ArticleIdSchema = zId.describe('文章 id');
/** 文章 shortId */
export const ArticleShortIdSchema = zStr.length(6, "shortId 必须是 6 位").describe("文章 shortId");
/** 文章标题 */
export const ArticleTitleSchema = zStr.max(255, "标题字数最多位 255 位").describe("文章标题");
/** 文章优先级 */
export const ArticlePrioritySchema = z.number('优先级必须是整数').int('优先级必须是整数').min(0, '优先级不能小于 0').max(100, '优先级不能大于 100').default(0).describe("文章优先级");
/** 文章封面缩略图片 URL */
export const ArticleThumbCoverSchema = zStr.max(255, "封面图片 URL 字数最多位 255 位").describe("文章封面缩略图片 URL");
/** 文章封面图片 URL */
export const ArticleCoverSchema = zStr.max(255, "封面图片 URL 字数最多位 255 位").describe("文章封面图片 URL");
/** 文章作者 */
export const ArticleAuthorSchema = zStr.max(32, "作者字数最多位 32 位").describe("文章作者");
/** 文章状态 */
export const ArticleStatusSchema = z.enum(['draft', 'published']).default('draft').describe('文章状态');
/** 文章描述 */
export const ArticleDescriptionSchema = zStr.max(255, "简介字数最多位 255 位").describe("文章简介");
/** 文章内容 */
export const ArticleContentSchema = zStr.describe("文章内容");
/** 允许评论 */
export const ArticleAllowCommentSchema = zBoolean.default(true).describe("是否允许评论");
/** 文章排序方式 */
export const ArticleSortSchema = z.enum(['asc', 'desc']).default('desc').describe("排序方式");
/** 文章排序字段 */
export const ArticleOrderBySchema = z.enum(['id', 'createdAt', 'updatedAt', 'priority']).default('createdAt').describe("排序字段");
/** 文章创建开始时间 */
export const ArticleCreatedFromSchema = zDate.optional().describe("创建开始时间");
/** 创建结束时间 */
export const ArticleCreatedToSchema = zDate.optional().describe("创建结束时间");
/** 文章作者短 ID */
export const ArticleAuthorShortIdSchema = zStr.length(6, "作者短 ID 必须是 6 位").describe("文章作者短 ID");
/** 文章封面路径 */
export const ArticleCoverPathSchema = zStr.max(255, "封面图片路径 字数最多位 255 位").describe("文章封面路径");
/** 文章图片路径列表 */
export const ArticleImagePathsSchema = z.array(zStr.max(255, "图片路径 字数最多位 255 位")).describe("文章图片路径列表");


/** 文章基础字段（公共字段） */
export const ArticleBaseSchema = z.object({
  title: ArticleTitleSchema,
  priority: ArticlePrioritySchema,
  thumbCover: ArticleThumbCoverSchema,
  author: ArticleAuthorSchema,
  allowComment: ArticleAllowCommentSchema,
  description: ArticleDescriptionSchema.optional(),
})