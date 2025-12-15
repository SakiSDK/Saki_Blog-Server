import { z } from 'zod';
import {
  zStr,
  zPageNum,
  zPageSize,
  zId,
  zDateTimeStr,
} from '../base.schema';

export const TagListQuerySchema = z.object({
  page: zPageNum.optional().describe("页码"),
  pageSize: zPageSize.optional().describe("每页数量"),
  keyword: zStr.max(50, "搜索关键字长度不能超过 50 个字符").optional().describe("搜索关键字"),
  // 时间参数
  createdFrom: zDateTimeStr.optional().describe("创建开始时间"),
  createdTo: zDateTimeStr.optional().describe("创建结束时间"),
  createdRange: zStr.max(50, "时间范围长度不能超过 50 个字符").optional().describe("时间范围"),
  // 排序参数
  orderBy: z.enum(['id', 'order', 'post_count', 'created_at', 'updated_at']).optional().describe("排序字段"),
  sort: z.enum(['asc', 'desc']).optional().describe("排序方式")
})

export const TagStatusParamsSchema = z.object({
  id: zId.describe("标签ID"),
})

export const TagDeleteParamsSchema = z.object({
  id: zId.describe("标签ID"),
})
export const TagBulkDeleteQuerySchema = z.object({
  ids: z
    .union([zId, z.array(zId)])
    .transform((val) => Array.isArray(val) ? val : [val])
    .describe("标签ID列表"),
})
export const TagUpdateParamasSchema = z.object({
  id: zId.describe("标签ID"),
})


export const TagCreateBodySchema = z.object({
  name: zStr
    .max(50, { message: '标签名称不能超过50个字符' })
    .trim()
    .nonempty({ message: '标签名称不能为空' }),
  description: z
    .string('必须是文本')
    .trim()
    .max(50, { message: '标签描述不能超过50个字符' })
    .or(z.literal(""))
    .nullable()
    .optional(),
  order: z.number()
    .int()
    .min(0, { message: '排序值不能小于0' })
    .max(999, { message: '排序值不能大于999' })
    .default(0)
    .optional(),
  status: z.enum(['active', 'inactive'] as const),
})
export const TagUpdataBodySchema = z.object({
  name: zStr
    .max(50, { message: '标签名称不能超过50个字符' })
    .trim()
    .nonempty({ message: '标签名称不能为空' }),
  description: z
    .string('必须是文本')
    .trim()
    .max(50, { message: '标签描述不能超过50个字符' })
    .or(z.literal(""))
    .nullable()
    .optional(),
  order: z.number()
    .int()
    .min(0, { message: '排序值不能小于0' })
    .max(999, { message: '排序值不能大于999' })
    .default(0)
    .optional(),
  status: z.enum(['active', 'inactive'] as const),
})


export type TagListQuery = z.infer<typeof TagListQuerySchema>;
export type TagStatusParams = z.infer<typeof TagStatusParamsSchema>;
export type TagCreateBody = z.infer<typeof TagCreateBodySchema>;
export type TagDeleteParams = z.infer<typeof TagDeleteParamsSchema>;
export type TagBulkDeleteQuery = z.infer<typeof TagBulkDeleteQuerySchema>;
export type TagUpdateParamas = z.infer<typeof TagUpdateParamasSchema>;
export type TagUpdataBody = z.infer<typeof TagUpdataBodySchema>;