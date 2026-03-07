import { AlbumController } from '@/controller/web/Album.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import { AlbumListQuerySchema, AlbumPhotoParamsSchema, AlbumPhotoQuerySchema } from '@/schemas/album/album.web';
import { Router } from 'express';


const router: Router = Router();

/** 
 * 获取相册列表
 * @route GET /web/album
 * @group web - 相册管理
 */
router.get(
  '/',
  zodValidate({
    query: AlbumListQuerySchema,
  }),
  AlbumController.getAlbumList
);

/**
 * 获取相册内的所有图片
 * @route GET /web/album/:slug/photos
 * @group web - 相册管理
 */
router.get(
  '/:slug/photos',
  zodValidate({
    params: AlbumPhotoParamsSchema,
    query: AlbumPhotoQuerySchema,
  }),
  AlbumController.getPhotosInAlbumBySlug
);

export default router;