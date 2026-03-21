import { Request, Response } from 'express';
import { CommentService } from '../../services/Comment.service';

export class CommentController {
  /**
   * 创建评论/回复评论
   */
  static async createComment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id; // 从 auth 中间件获取用户 ID
      if (!userId) {
        res.status(401).json({ code: 401, success: false, message: '请先登录' });
        return;
      }

      const { postId, parentId, content, userDevice, userBrowser } = req.body;
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

      const result = await CommentService.createComment({
        post_id: postId,
        parent_id: parentId,
        content,
        user_device: userDevice,
        user_browser: userBrowser,
        user_ip: userIp as string,
      }, userId);

      res.status(200).json({
        code: 200,
        success: true,
        message: '评论发表成功',
        data: result,
      });
    } catch (error: any) {
      res.status(error.status || 400).json({
        code: error.status || 400,
        success: false,
        message: error.message || '发表评论失败',
      });
    }
  }

  /**
   * 获取文章评论列表
   */
  static async getCommentsByPostId(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const result = await CommentService.getNestedCommentsByPostId(
        Number(postId),
        Number(page),
        Number(pageSize)
      );

      res.status(200).json({
        code: 200,
        success: true,
        message: '获取评论成功',
        data: result,
      });
    } catch (error: any) {
      res.status(error.status || 400).json({
        code: error.status || 400,
        success: false,
        message: error.message || '获取评论失败',
      });
    }
  }

  /**
   * 获取单条评论详情
   */
  static async getCommentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await CommentService.getCommentById(Number(id));

      res.status(200).json({
        code: 200,
        success: true,
        message: '获取评论成功',
        data: result,
      });
    } catch (error: any) {
      res.status(error.status || 404).json({
        code: error.status || 404,
        success: false,
        message: error.message || '评论不存在',
      });
    }
  }

  /**
   * 删除评论
   */
  static async deleteComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id; // 从 auth 中间件获取用户 ID
      
      if (!userId) {
        res.status(401).json({ code: 401, success: false, message: '请先登录' });
        return;
      }

      const result = await CommentService.deleteComment(Number(id), userId);

      res.status(200).json({
        code: 200,
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(error.status || 403).json({
        code: error.status || 403,
        success: false,
        message: error.message || '删除评论失败',
      });
    }
  }
}