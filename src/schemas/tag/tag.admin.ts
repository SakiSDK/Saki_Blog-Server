import { z } from 'zod';
import {
  zStr,
  zPageNum,
  zPageSize,
  zId,
  zDateTimeStr,
} from '../base.schema';
import {
  TagIdSchema,
  TagNameSchema,
  TagDescriptionSchema,
  TagOrderSchema,
  TagStatusSchema,
} from './tag.shared';


/** ---------- 查询参数 ---------- */

/** 标签列表查询参数 */
export const TagListQuerySchema = z.object({
  page: zPageNum.describe("页码"),
  pageSize: zPageSize.describe("每页数量"),
  id: TagIdSchema.optional().describe("标签ID"),
  status: TagStatusSchema.optional().describe("标签状态"),
  keyword: zStr.max(50, "搜索关键字长度不能超过 50 个字符").optional().describe("搜索关键字"),
  createdFrom: zDateTimeStr.optional().describe("创建开始时间"),
  createdTo: zDateTimeStr.optional().describe("创建结束时间"),
  orderBy: z.enum(['id', 'order', 'postCount', 'createdAt', 'updatedAt']).optional().describe("排序字段"),
  sort: z.enum(['asc', 'desc']).optional().describe("排序方式")
});

/** 批量删除查询参数 */
export const TagBulkDeleteQuerySchema = z.object({
  ids: z
    .union([zId, z.array(zId)])
    .transform((val) => Array.isArray(val) ? val : [val])
    .describe("标签ID列表"),
});


/** ---------- 路径参数 ---------- */

/** 标签状态更新参数 */
export const TagStatusParamsSchema = z.object({
  id: TagIdSchema,
});

/** 标签删除参数 */
export const TagDeleteParamsSchema = z.object({
  id: TagIdSchema,
});

/** 标签更新参数 */
export const TagUpdateParamsSchema = z.object({
  id: TagIdSchema,
});


/** ---------- 请求体 ---------- */

/** 创建标签请求体 */
export const TagCreateBodySchema = z.object({
  name: TagNameSchema,
  description: TagDescriptionSchema,
  order: TagOrderSchema,
  status: TagStatusSchema,
});

/** 更新标签请求体 */
export const TagUpdateBodySchema = z.object({
  name: TagNameSchema,
  description: TagDescriptionSchema,
  order: TagOrderSchema,
  status: TagStatusSchema,
});


/** ---------- 类型导出 ---------- */

export type TagListQuery = z.infer<typeof TagListQuerySchema>;
export type TagStatusParams = z.infer<typeof TagStatusParamsSchema>;
export type TagDeleteParams = z.infer<typeof TagDeleteParamsSchema>;
export type TagBulkDeleteQuery = z.infer<typeof TagBulkDeleteQuerySchema>;
export type TagUpdateParams = z.infer<typeof TagUpdateParamsSchema>;
export type TagCreateBody = z.infer<typeof TagCreateBodySchema>;
export type TagUpdateBody = z.infer<typeof TagUpdateBodySchema>;
