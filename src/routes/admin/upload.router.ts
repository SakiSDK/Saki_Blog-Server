import { Router } from 'express';
import { upload } from '@/middlewares/upload.middleware';
import { UploadController } from '@/controller/admin/Upload.controller';

const router: Router = Router();

/**
 * 上传文章图片（临时存储）
 * @route POST /admin/upload/article/image
 * @group admin - 上传管理
 * @param {file} file.formData.required - 图片文件
 */
router.post(
  '/article/image',
  upload.image({
    path: 'articles/images'
  }),
  UploadController.uploadArticleImage
);

/** 
 * 删除文章内临时图片
 * @route DELETE /admin/upload/article/image/:filename
 * @group admin - 上传管理
 * @param {string} path.filename.required - 图片文件名
 */
router.delete(
  '/article/image/:filename',
  UploadController.createDeleteHandler('articles/images')
);


/** 
 * 上传文章封面（临时存储）
 * @route POST /admin/upload/article/cover
 * @group admin - 上传管理
 * @param {file} file.formData.required - 图片文件
 */
router.post(
  '/article/cover',
  upload.image({
    path: 'articles/covers'
  }),
  UploadController.uploadArticleCover
);

/** 
 * 删除文章封面
 * @route DELETE /admin/upload/article/cover/:filename
 * @group admin - 上传管理
 * @param {string} path.filename.required - 图片文件名
 */
router.delete(
  '/article/cover/:filename',
  UploadController.createDeleteHandler('articles/covers')
);

export default router;
