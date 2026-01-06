import { Router } from 'express';
// import { upload, uploadErrorHandler } from '@/middlewares/upload.middleware';
import { UploadController } from '@/controller/admin/Upload.controller';

const router: Router = Router();

// /**
//  * 上传文章图片（临时存储）
//  * @route POST /admin/upload/article/image
//  * @group admin - 上传管理
//  * @param {file} file.formData.required - 图片文件
//  */
// router.post(
//   '/article/image',
//   upload.single('file'),
//   uploadErrorHandler,
//   UploadController.uploadArticleImage
// );

// /**
//  * 确认上传文件（从临时目录移动到正式目录）
//  * @route POST /admin/upload/confirm
//  * @group admin - 上传管理
//  */
// router.post('/article/confirm', UploadController.confirmFiles);

// /**
//  * 清理临时文件
//  * @route POST /admin/upload/clean
//  * @group admin - 上传管理
//  */
// router.post('/article/clean', UploadController.deleteTempFiles);

export default router;
