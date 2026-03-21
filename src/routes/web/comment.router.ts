import { authenticateToken } from "@/middlewares/auth.middleware";
import { CommentController } from "../../controller/web/Comment.controller";
import { Router } from "express";
import { zodValidate } from "@/middlewares/zodValidate";
import { CommentCreateBodySchema, CommentIdParamSchema, CommentListQuerySchema } from "@/schemas/comment/comment.web.schema";

const router: Router = Router()

/** 创建评论/回复 */
router.post('/', authenticateToken, zodValidate({
  body: CommentCreateBodySchema,
}), CommentController.createComment)

/** 获取某篇文章的评论列表 */
router.get('/post/:postId', zodValidate({
  query: CommentListQuerySchema,
}), CommentController.getCommentsByPostId)

/** 删除评论 */
router.delete('/:id', authenticateToken, zodValidate({
  params: CommentIdParamSchema,
}), CommentController.deleteComment)

export default router