import {z} from 'zod';
import { zId, zInteger, zStr } from '../base.schema';


/** ---------- 相册基础类型 ---------- */
/** 相册ID */
export const AlbumIdSchema = zId.describe('相册ID');
/** 相册名称 */
export const AlbumNameSchema = zStr.max(50, '相册名称不能超过50个字符').describe('相册名称');
/** 相册标题 */
export const AlbumTitleSchema = zStr.max(100, '相册标题不能超过100个字符').describe('相册标题');
/** 相册别名 */
export const AlbumSlugSchema = zStr.max(100, '相册别名不能超过100个字符').describe('相册别名');
/** 相册描述 */
export const AlbumDescriptionSchema = zStr.max(256, '相册描述不能超过256个字符').describe('相册描述');
/** 相册封面ID */
export const AlbumCoverSchema = zStr.describe('相册封面ID');
/** 相册创建者 */
export const AlbumCreatorSchema = zStr.describe('相册创建者');
/** 相册照片数量 */
export const AlbumPhotoCountSchema = zInteger.describe('相册照片数量');
/** 相册排序字段 */
export const AlbumOrderBySchema = z.enum([
  'id', 'priority', 'photoCount', 'createdAt',
]).describe('相册排序字段');
/** 相册状态 */
export const AlbumStatusSchema = z.enum([
  'public', 'private',
]).describe('相册状态');
/** 相册图片ID */
export const AlbumPhotoIdSchema = zId.describe('相册图片ID');


/** 照片宽度 */
export const PhotoWidthSchema = zInteger.describe('照片宽度');
/** 照片高度 */
export const PhotoHeightSchema = zInteger.describe('照片高度');
/** 照片原图 */
export const PhotoOriginalSchema = zStr.describe('照片原图');
/** 照片缩略图 */
export const PhotoThumbCoverSchema = zStr.describe('照片缩略图');
/** 照片大小 */
export const PhotoSizeSchema = zInteger.describe('照片大小');
