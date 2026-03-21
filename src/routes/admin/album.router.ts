import { Router } from 'express';
import { AlbumController } from '@/controller/admin/Album.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import { AlbumBulkDeleteParamsSchema, AlbumCreateBodySchema, AlbumDeleteParamsSchema, AlbumListQuerySchema, AlbumPhotoDeleteQuerySchema, AlbumUpdateBodySchema } from '@/schemas/album/album.admin';
import { upload } from '@/middlewares/upload.middleware';



const router: Router = Router();

/**
 * 创建相册
 * @route POST /admin/album
 * @group admin - 相册管理
 */
router.post(
  '/',
  upload.none(),
  zodValidate({
    body: AlbumCreateBodySchema,
  }),
  AlbumController.createAlbum
);

/**
 * 获取相册列表
 * @route GET /admin/album
 * @group admin - 相册管理
 */
router.get(
  '/',
  zodValidate({
    query: AlbumListQuerySchema
  }),

  AlbumController.getAlbumList
);

/**
 * 更新相册
 * @route PUT /admin/album/:id
 * @group admin - 相册管理
 */
router.put(
  '/:id',
  upload.none(),
  zodValidate({
    body: AlbumUpdateBodySchema,
  }),
  AlbumController.updateAlbum
);

/**
 * 删除相册（支持批量删除）
 * @route DELETE /admin/album
 * @group admin - 相册管理
 */
router.delete(
  '/',
  zodValidate({
    query: AlbumBulkDeleteParamsSchema
  }),
  AlbumController.deleteAlbums
);

/**
 * 删除单个相册
 * @route DELETE /admin/album/:id
 * @group admin - 相册管理
 */
router.delete(
  '/:id',
  zodValidate({
    params: AlbumDeleteParamsSchema
  }),
  AlbumController.deleteAlbum
);

/** 
 * 获取相册内的所有图片
 * @route GET /admin/album/:id/photos
 * @group admin - 相册管理
 */
router.get(
  '/:id/photos',
  zodValidate({
    params: AlbumDeleteParamsSchema
  }),
  AlbumController.getPhotosInAlbum
);

/** 
 * 删除相册内的照片
 * @route DELETE /admin/album/:id/photos
 * @group admin - 相册管理
 */
router.delete(
  '/:id/photos',
  zodValidate({
    params: AlbumDeleteParamsSchema,
    query: AlbumPhotoDeleteQuerySchema,
  }),
  AlbumController.deletePhotosInAlbum
);

export default router;
