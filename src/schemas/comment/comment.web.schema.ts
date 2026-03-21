import { z } from 'zod';
import { zId, zPageNum, zPageSize, zStr } from '../base.schema';

/** ---------- 请求体 ---------- */
export const CommentCreateBodySchema = z.object({
  postId: zId.describe('文章ID'),
  parentId: zId.optional().describe('父评论ID'),
  content: zStr.max(2000, '评论内容不能超过2000字').describe('评论内容'),
  userDevice: zStr.optional().describe('用户设备'),
  userBrowser: zStr.optional().describe('用户浏览器'),
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