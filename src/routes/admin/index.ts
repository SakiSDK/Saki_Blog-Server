import { Router } from "express";
import AuthAdminRoute from "./auth.router";
import TagRoute from "./tag.router";
import CategoryRoute from "./category.router";
import UploadRoute from "./upload.router";
import ArticleRoute from "./article.router";

const router: Router = Router();

// // 
router.use('/auth', AuthAdminRoute)

// // 全局中间件：所有子路由都需要先认证 + 角色必须是admin
// router.use(authenticateToken);
// router.use(requireRole(['admin']));

router.use('/tag', TagRoute) 
router.use('/category', CategoryRoute)
router.use('/upload', UploadRoute)
router.use('/article', ArticleRoute)

export default router;