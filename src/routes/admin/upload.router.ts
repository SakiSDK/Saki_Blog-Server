import { uploadArticleImage } from '@/controller/admin/Upload.controller';
import { uploadErrorHandler } from '@/middlewares/upload';
import { Router } from 'express';


const router: Router = Router();


//? 后续添加验证登录和用户权限中间件
router.post('/article/image', uploadArticleImage, uploadErrorHandler)

export default router;