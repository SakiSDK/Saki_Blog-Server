import { PostController } from "../../controller/Post.controller";
import { authenticateToken } from "../../middlewares/auth";
import { CommentController } from "../../controller/Comment.controller";
import { Router } from "express";

const router: Router = Router();

router.get('/', PostController.getWebPostList);

router.get('/recent', PostController.getRecentPosts);

router.get('/search', PostController.searchPostList);

router.get('/:shortId', PostController.getPostDetail);

router.post('/:shortId/comment', authenticateToken, CommentController.createComment)

router.get('/:shortId/comment', CommentController.getNestedCommentsByPostId)

export default router;