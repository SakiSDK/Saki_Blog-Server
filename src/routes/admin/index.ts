import { Router } from "express";
import AuthAdminRoute from "./auth.router";
import TagRoute from "./tag.router";
import CategoryRoute from "./category.router";
import UploadRoute from "./upload.router";
import ArticleRoute from "./article.router";
import AlbumRoute from "./album.router";

const router: Router = Router();


/** 
 * 认证路由
 */
router.use('/auth', AuthAdminRoute)

// // 全局中间件：所有子路由都需要先认证 + 角色必须是admin
// router.use(authenticateToken);
// router.use(requireRole(['admin']));

/** 
 * 标签路由
 */
router.use('/tag', TagRoute) 

/** 
 * 分类路由
 */
router.use('/category', CategoryRoute)

/** 
 * 上传路由
 */
router.use('/upload', UploadRoute)

/** 
 * 文章路由
 */
router.use('/article', ArticleRoute)

/** 
 * 相册路由
 */
router.use('/album', AlbumRoute)

export default router;
