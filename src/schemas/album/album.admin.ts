import { z } from 'zod';
import {
  AlbumCoverSchema, AlbumCreatorSchema, AlbumDescriptionSchema, AlbumIdSchema, AlbumNameSchema,
  AlbumOrderBySchema, AlbumPhotoCountSchema, AlbumPhotoIdSchema, AlbumStatusSchema, AlbumTitleSchema,
  PhotoHeightSchema, PhotoOriginalSchema, PhotoSizeSchema, PhotoThumbCoverSchema, PhotoWidthSchema
} from './album.shared';
import { zDate, zPageNum, zPageSize, zSortOrder, zStr } from '../base.schema';



/** ---------- 相册类型 ---------- */
/** 相册信息 */
export const AlbumInfoSchema = z.object({
  id: AlbumIdSchema,
  name: AlbumNameSchema,
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.optional().nullable(),
  cover: AlbumCoverSchema.optional().nullable(),
  thumbCover: zStr.describe('相册缩略图').optional().nullable(),
  coverPhotoId: AlbumPhotoIdSchema.optional().nullable(),
  photoCount: AlbumPhotoCountSchema,
  priority: z.number().int().nonnegative().optional().describe("相册优先级"),
  status: AlbumStatusSchema.optional().describe("相册状态"),
  creator: AlbumCreatorSchema,
});

/** 照片信息 */
export const PhotoInfoSchema = z.object({
  id: AlbumPhotoIdSchema,
  width: PhotoWidthSchema,
  height: PhotoHeightSchema,
  originalUrl: PhotoOriginalSchema,
  thumbnailUrl: PhotoThumbCoverSchema,
  fileSize: PhotoSizeSchema,
});



/** ---------- 请求类型 ---------- */
/** 获取相册列表参数 */
export const AlbumListQuerySchema = z.object({
  page: zPageNum.describe("页码"),
  pageSize: zPageSize.describe("每页数量"),
  status: AlbumStatusSchema.optional().describe("相册状态"),
  /** 排序字段 */
  orderBy: AlbumOrderBySchema.optional(),
  /** 排序顺序 */
  sort: zSortOrder.optional(),
});

/** 删除相册的列表参数 */
export const AlbumDeleteQuerySchema = z.object({
  ids: z.array(AlbumIdSchema).nonempty('至少选择一个相册'),
});

/** 相册搜索列表参数 */
export const AlbumSearchQuerySchema = AlbumListQuerySchema.extend({
  keyword: zStr.optional().describe("搜索关键词"),
  status: AlbumStatusSchema.optional().describe("相册状态"),
  createdFrom: zDate.optional().describe("创建开始时间"),
  createdTo: zDate.optional().describe("创建结束时间"),
});

/** 相册创建参数 */
export const AlbumCreateBodySchema = z.object({
  name: AlbumNameSchema,
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.optional().nullable(),
  status: AlbumStatusSchema.optional().describe("相册状态"),
});

/** 相册更新参数 */
export const AlbumUpdateBodySchema = AlbumCreateBodySchema.extend({
  /** 相册优先级 */
  priority: z.number().int().nonnegative().optional().describe("相册优先级"),
  /** 相册封面ID */
  coverPhotoId: AlbumPhotoIdSchema.optional().nullable().describe("相册封面ID"),
});

/** 相册 ID 参数 */
export const AlbumIdParamsSchema = z.object({
  /** 相册 ID */
  id: AlbumIdSchema,
})

/** 删除相册参数验证 */
export const AlbumBulkDeleteParamsSchema = z.array(AlbumIdSchema).nonempty('至少选择一个相册');

/** 删除单个相册参数验证 */
export const AlbumDeleteParamsSchema = z.object({
  /** 相册 ID */
  id: AlbumIdSchema,
});


/** ---------- 类型推导 ---------- */
/** 返回相册简要类型 */
export type AlbumBrief = z.infer<typeof AlbumInfoSchema>;
/** 返回照片简要类型 */
export type PhotoInfo = z.infer<typeof PhotoInfoSchema>;

/** 相册列表参数类型 */
export type AlbumListQuery = z.infer<typeof AlbumListQuerySchema>;
/** 创建相册请求类型 */
export type AlbumCreateBody = z.infer<typeof AlbumCreateBodySchema>;
/** 更新相册请求类型 */
export type AlbumUpdateBody = z.infer<typeof AlbumUpdateBodySchema>;


