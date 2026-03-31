import { z } from 'zod';
import { AnnounceIdSchema, AnnouncePrioritySchema, AnnounceTypeSchema } from './announce.share';
import { zPageNum, zPageSize } from '../base.schema';

/** 公告列表查询参数 */
export const AnnounceListQuerySchema = z.object({
  type: AnnounceTypeSchema,
  priority: AnnouncePrioritySchema,
  page: zPageNum.default(1),
  pageSize: zPageSize.default(10),
}).partial();

/** 公告ID参数 */
export const AnnounceIdParamsSchema = z.object({
  id: AnnounceIdSchema,
});


/** ---------- 类型推导 ---------- */
/** 公告列表查询参数 */
export type AnnounceListQueryVo = z.infer<typeof AnnounceListQuerySchema>;
/** 公告ID参数 */
export type AnnounceIdParams = z.infer<typeof AnnounceIdParamsSchema>;
