import { z } from 'zod';
import { AlbumCoverSchema, AlbumDescriptionSchema, AlbumNameSchema, AlbumSlugSchema, AlbumTitleSchema, PhotoHeightSchema, PhotoOriginalSchema, PhotoThumbCoverSchema, PhotoWidthSchema } from './album.shared';
import { zPageNum, zPageSize } from '../base.schema';


/** ---------- 相册类型 ---------- */
/** 相册信息 */
export const AlbumBriefSchema = z.object({
  slug: AlbumSlugSchema,
  name: AlbumNameSchema,
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.optional().nullable(),
  cover: AlbumCoverSchema.optional().nullable(),
})

/** 照片信息 */
export const PhotoBriefSchema = z.object({
  width: PhotoWidthSchema,
  height: PhotoHeightSchema,
  originalUrl: PhotoOriginalSchema,
  thumbnailUrl: PhotoThumbCoverSchema,
})


/** ---------- 相册请求信息 ---------- */
/** 获取相册列表请求信息 */
export const AlbumListQuerySchema = z.object({
  page: zPageNum.default(1),
  pageSize: zPageSize.default(10),
})
/** 获取相册所有图片请求信息 */
export const AlbumPhotoQuerySchema = z.object({
  page: zPageNum.default(1),
  pageSize: zPageSize.default(10),
})
/** 获取相册所有图片参数类型 */
export const AlbumPhotoParamsSchema = z.object({
  slug: AlbumSlugSchema,
})



/** ---------- 类型推导 ---------- */
/** 相册简要信息 */
export type AlbumVo = z.infer<typeof AlbumBriefSchema>;
/** 照片简要信息 */
export type PhotoVo = z.infer<typeof PhotoBriefSchema>;

/** 获取相册所有图片参数类型 */
export type AlbumPhotoParams = z.infer<typeof AlbumPhotoParamsSchema>;
