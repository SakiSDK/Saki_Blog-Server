import { Router } from "express";
// import UserAdminRoute from './user.router'
// import AmapAdminRoute from './amap.router'
import AuthAdminRoute from "./auth.router";
import TagRoute from "./tag.router";
import CategoryRoute from "./category.router";
import UploadRoute from "./upload.router";
// import AlbumAdminRoute from "./album.router";
// import PhotoAdminRoute from './photo.router'
// import CategoryAdminRoute from "./category.router";
// import PostAdminRoute from "./post.router";
// import { authenticateToken, requireRole } from "../../middlewares/auth";

const router: Router = Router();

// // 
router.use('/auth', AuthAdminRoute)

// // 全局中间件：所有子路由都需要先认证 + 角色必须是admin
// router.use(authenticateToken);
// router.use(requireRole(['admin']));

// router.use('/user', UserAdminRoute)
// router.use('/amap', AmapAdminRoute)
// router.use('/album', AlbumAdminRoute)
// router.use('/photo', Ph阿萨斯撒网闻所未闻哇哇哇哇
router.use('/tag', TagRoute) 
router.use('/category', CategoryRoute)
router.use('/upload', UploadRoute)
// router.use('/post', PostAdminRoute)

export default router;