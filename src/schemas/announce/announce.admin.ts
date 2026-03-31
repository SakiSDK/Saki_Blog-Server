import { z } from 'zod';
import { zPageNum, zPageSize, zId } from '../base.schema';
import { AnnounceContentSchema, AnnouncePrioritySchema, AnnounceTypeSchema } from './announce.share';

/** ---------- 查询参数 ---------- */
export const AnnounceListQuerySchema = z.object({
  page: zPageNum,
  pageSize: zPageSize,
  type: AnnounceTypeSchema.optional(),
  priority: AnnouncePrioritySchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/** ---------- 请求参数 ---------- */
export const AnnounceIdParamSchema = z.object({
  id: zId,
});

/** ---------- 请求体 ---------- */
export const AnnounceCreateBodySchema = z.object({
  content: AnnounceContentSchema,
  type: AnnounceTypeSchema,
  priority: AnnouncePrioritySchema.default('low'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const AnnounceUpdateBodySchema = z.object({
  content: AnnounceContentSchema.optional(),
  type: AnnounceTypeSchema.optional(),
  priority: AnnouncePrioritySchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const AnnounceBulkDeleteBodySchema = z.object({
  ids: z.array(zId).nonempty('请至少选择一个公告ID'),
});

export const AnnounceBulkDeleteQuerySchema = z.object({
  ids: z
    .union([z.string(), z.array(z.string()), z.number(), z.array(z.number())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .transform((val) => val.map((v) => Number(v)))
    .refine((val) => val.length > 0, { message: '请至少选择一个公告ID' })
    .refine((val) => val.every((v) => Number.isInteger(v) && v > 0), { message: '公告ID必须为正整数' }),
});

/** ---------- 类型导出 ---------- */
export type AnnounceListQuery = z.infer<typeof AnnounceListQuerySchema>;
export type AnnounceCreateBody = z.infer<typeof AnnounceCreateBodySchema>;
export type AnnounceUpdateBody = z.infer<typeof AnnounceUpdateBodySchema>;
