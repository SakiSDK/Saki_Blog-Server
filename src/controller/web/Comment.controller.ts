import { Request, Response } from 'express';
import { CommentService } from '../../services/Comment.service';
import { Article } from '../../models';
import { logger } from '@/utils/logger.util';
import { config } from '@/config';


export class CommentController {
  /**
   * 创建评论/回复评论
   */
  static async createComment(req: Request, res: Response) {
    try {

      const userId = (req as any).user?.id; // 从 auth 中间件获取用户 ID
      console.log("user: ", (req as any).user)
      if (!userId) {
        res.status(401).json({ code: 401, success: false, message: '请先登录' });
        return;
      }

      let { postId, post_id, parentId, parent_id, replyToId, reply_to_id, content, userDevice, user_device, userBrowser, user_browser } = req.body;
        
        // 兼容前端可能传下划线或驼峰格式
        postId = postId || post_id;
        parentId = parentId || parent_id || replyToId || reply_to_id;
        userDevice = userDevice || user_device;
        userBrowser = userBrowser || user_browser;
      
      // 如果 body 里没有 postId，尝试从 params 获取
      if (!postId && req.params.postId) {
        let articleId = Number(req.params.postId);
        if (isNaN(articleId)) {
          const article = await Article.findOne({ where: { shortId: req.params.postId } });
          if (!article) {
            res.status(404).json({ code: 404, success: false, message: '文章不存在' });
            return;
          }
          articleId = article.id;
        }
        postId = articleId;
      }

      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

      const result = await CommentService.createComment({
        postId,
        parentId,
        content,
        userDevice,
        userBrowser,
        userIp,
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
  static async getCommentsByArticleShortId(req: Request, res: Response) {
    try {
      const { postId: rawShortId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;
      
      let articleId = Number(rawShortId);
      // 如果 postId 无法转换为数字，说明传入的是 shortId
      if (isNaN(articleId)) {
        const article = await Article.findOne({ where: { shortId: rawShortId } });
        if (!article) {
          res.status(404).json({ code: 404, success: false, message: '文章不存在' });
          return;
        }
        articleId = article.id;
      }

      const result = await CommentService.getNestedCommentsByArticleId(
        articleId,
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

  /**
   * AI文章评论（返回5条评论供选择）
   */
  static async aiComment(req: Request, res: Response) {
    const { shortId } = req.params;

    // 检查功能是否启用
    if (!config.deepseek.enabled) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: 'AI评论功能未启用',
      });
    }

    try {
      // 获取文章并生成5条AI评论
      const comments = await CommentService.generateAiComments(shortId);

      res.status(200).json({
        code: 200,
        success: true,
        message: 'AI评论生成成功',
        data: comments,
      });
    } catch (error: any) {
      logger.error('AI评论生成失败', { error: error.message });
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '生成失败',
      });
    }
  }
}