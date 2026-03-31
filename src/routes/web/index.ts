import { Router } from "express";
import AlbumWebRouter from "./album.router";
// import AuthWebRouter from "./auth.router";
// import AmapWebRouter from "./amap.rouer";
import CategoryRouter from "./category.router";
import TagRouter from './tag.router';
import ArticleRouter from './article.router'
// import UserWebRouter from "./user.router";
import CommentRouter from "./comment.router";
import AnnounceRouter from './announce.router'


const router: Router = Router();

// router.use('/auth', AuthWebRouter)
// router.use('/amap', AmapWebRouter)
router.use('/album', AlbumWebRouter)
router.use('/category', CategoryRouter)
router.use('/tag', TagRouter)
router.use('/article', ArticleRouter)
// router.use('/user', UserWebRouter);
router.use('/announce', AnnounceRouter);
router.use('/comment', CommentRouter);

export default router;
