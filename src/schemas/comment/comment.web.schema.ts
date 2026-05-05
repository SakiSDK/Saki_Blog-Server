import { z } from 'zod';
import { zId, zPageNum, zPageSize, zStr } from '../base.schema';

/** ---------- 请求体 ---------- */
export const CommentCreateBodySchema = z.object({
  postId: zId.optional().describe('文章ID'),
  post_id: zId.optional().describe('文章ID'),
  parentId: zId.optional().describe('父评论ID'),
  parent_id: zId.optional().describe('父评论ID'),
  replyToId: zId.optional().describe('回复的评论ID'),
  reply_to_id: zId.optional().describe('回复的评论ID'),
  userId: zStr.optional().describe('用户ID'),
  content: zStr.max(2000, '评论内容不能超过2000字').describe('评论内容'),
  userDevice: zStr.optional().describe('用户设备'),
  user_device: zStr.optional().describe('用户设备'),
  userBrowser: zStr.optional().describe('用户浏览器'),
  user_browser: zStr.optional().describe('用户浏览器'),
});

/** ---------- 查询参数 ---------- */
export const CommentListQuerySchema = z.object({
  page: zPageNum,
  pageSize: zPageSize,
});

export const CommentIdParamSchema = z.object({
  id: zId,
});


/** ---------- 类型推导 ---------- */
export type CommentCreateBody = z.infer<typeof CommentCreateBodySchema>;
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;