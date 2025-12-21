import { z } from 'zod';
import {
  zStr,
  zPageNum,
  zPageSize,
  zId,
  zDateTimeStr,
} from '../base.schema';


export const CategoryListQuerySchema = z.object({
  page: zPageNum.optional().describe("页码"),
  pageSize: zPageSize.optional().describe("每页数量"),
  id: z.union([
    z.string('分类ID必须是文本类型')
      .regex(/^\d+$/, { message: '分类ID必须是数字' })
      .max(20, { message: '分类ID不能超过20个字符' })
      .transform((val) => Number(val))
      .refine((val) => val >= 1, { message: '分类ID必须大于0' }),
    z.number({ message: '分类ID必须是数字' })
      .int({ message: '分类ID必须是整数' })
      .min(1, { message: '分类ID必须大于0' }),
    z.literal('')
  ]).nullable().optional(),
  name: z.union([
    zStr.max(50, { message: '分类名称不能超过50个字符' }),
    z.literal('')
  ]).nullable().optional(),
  status: z.union([
    z.enum(['active', 'inactive'], { message: '只能选择激活或者未激活' }),
    z.literal('')
  ]).nullable().optional(),
  keyword: zStr.max(50, "搜索关键字长度不能超过 50 个字符").optional().describe("搜索关键字"),
  createdFrom: zDateTimeStr.optional().describe("创建开始时间"),
  createdTo: zDateTimeStr.optional().describe("创建结束时间"),
  orderBy: z.enum(['id', 'name', 'order', 'post_count', 'created_at', 'updated_at']).optional().describe("排序字段"),
  sort: z.enum(['asc', 'desc']).optional().describe("排序方式")
})

export const CategoryStatusParamsSchema = z.object({
  id: zId.describe("分类ID"),
})

export const CategoryDeleteParamsSchema = z.object({
  id: zId.describe("分类ID"),
})

export const CategoryBulkDeleteQuerySchema = z.object({
  ids: z
    .union([zId, z.array(zId)])
    .transform((val) => Array.isArray(val) ? val : [val])
    .describe("分类ID列表"),
})

export const CategoryUpdateParamsSchema = z.object({
  id: zId.describe("分类ID"),
})

export const CategoryCreateBodySchema = z.object({
  name: zStr
    .max(50, { message: '分类名称不能超过50个字符' })
    .trim()
    .nonempty({ message: '分类名称不能为空' }),
  description: z
    .string('必须是文本')
    .trim()
    .max(256, { message: '分类描述不能超过256个字符' })
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

export const CategoryUpdateBodySchema = z.object({
  name: zStr
    .max(50, { message: '分类名称不能超过50个字符' })
    .trim()
    .nonempty({ message: '分类名称不能为空' }),
  description: z
    .string('必须是文本')
    .trim()
    .max(256, { message: '分类描述不能超过256个字符' })
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


export type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
export type CategoryStatusParams = z.infer<typeof CategoryStatusParamsSchema>;
export type CategoryDeleteParams = z.infer<typeof CategoryDeleteParamsSchema>;
export type CategoryBulkDeleteQuery = z.infer<typeof CategoryBulkDeleteQuerySchema>;
export type CategoryUpdateParams = z.infer<typeof CategoryUpdateParamsSchema>;
export type CategoryCreateBody = z.infer<typeof CategoryCreateBodySchema>;
export type CategoryUpdateBody = z.infer<typeof CategoryUpdateBodySchema>;
