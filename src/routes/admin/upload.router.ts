import { moveEditingImages, uploadArticleImage, uploadArticleImageForEditing } from '@/controller/admin/Upload.controller';
import { uploadErrorHandler } from '@/middlewares/upload.middleware';
import { Router } from 'express';


const router: Router = Router();


//? 后续添加验证登录和用户权限中间件
// 1. 编辑模式上传（写文章时）
router.post('/articles/editing/images', uploadArticleImageForEditing);

// 2. 正式上传（发布文章）
router.post('/articles/:articleId/images', uploadArticleImage);

// 3. 移动临时文件到正式目录（保存草稿或发布时）
router.post('/articles/:articleId/move-images', moveEditingImages);

export default router;