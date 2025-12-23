import { Router } from "express";
// import AlbumWebRouter from "./album.router";
// import AuthWebRouter from "./auth.router";
// import AmapWebRouter from "./amap.rouer";
import CategoryRouter from "./category.router";
import TagRouter from './tag.router';
// import PostWebRouter from "./post.router";
// import UserWebRouter from "./user.router";
// import CommentWebRouter from "./comment.router";

const router: Router = Router();

// router.use('/auth', AuthWebRouter)
// router.use('/amap', AmapWebRouter)
// router.use('/album', AlbumWebRouter)
router.use('/category', CategoryRouter)
router.use('/tag', TagRouter)
// router.use('/post', PostWebRouter)
// router.use('/user', UserWebRouter);
// router.use('/comment', CommentWebRouter);

export default router;