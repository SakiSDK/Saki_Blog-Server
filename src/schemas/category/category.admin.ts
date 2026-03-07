import { z } from 'zod';
import {
  zPageNum,
  zPageSize,
  zId,
  zDateTimeStr,
  zSearchKeyword,
} from '../base.schema';
import {
  CategoryIdSchema,
  CategoryNameSchema,
  CategoryDescriptionSchema,
  CategoryOrderSchema,
  CategoryStatusSchema,
} from './category.shared';


/** ---------- 查询参数 ---------- */

/** 分类列表查询参数 */
export const CategoryListQuerySchema = z.object({
  page: zPageNum.describe("页码"),
  pageSize: zPageSize.describe("每页数量"),
  id: CategoryIdSchema.optional().describe("分类ID"),
  status: CategoryStatusSchema.nullable().optional(),
  keyword: zSearchKeyword.optional().describe("搜索关键字"),
  createdFrom: zDateTimeStr.optional().describe("创建开始时间"),
  createdTo: zDateTimeStr.optional().describe("创建结束时间"),
  orderBy: z.enum(['id', 'name', 'order', 'postCount', 'createdAt', 'updatedAt']).optional().describe("排序字段"),
  sort: z.enum(['asc', 'desc']).optional().describe("排序方式")
});

/** 批量删除查询参数 */
export const CategoryBulkDeleteQuerySchema = z.object({
  ids: z
    .union([zId, z.array(zId)])
    .transform((val) => Array.isArray(val) ? val : [val])
    .describe("分类ID列表"),
});


/** ---------- 路径参数 ---------- */

/** 分类状态更新参数 */
export const CategoryStatusParamsSchema = z.object({
  id: CategoryIdSchema,
});

/** 分类删除参数 */
export const CategoryDeleteParamsSchema = z.object({
  id: CategoryIdSchema,
});

/** 分类更新参数 */
export const CategoryUpdateParamsSchema = z.object({
  id: CategoryIdSchema,
});


/** ---------- 请求体 ---------- */

/** 创建分类请求体 */
export const CategoryCreateBodySchema = z.object({
  name: CategoryNameSchema,
  description: CategoryDescriptionSchema,
  order: CategoryOrderSchema,
  status: CategoryStatusSchema,
});

/** 更新分类请求体 */
export const CategoryUpdateBodySchema = z.object({
  name: CategoryNameSchema,
  description: CategoryDescriptionSchema,
  order: CategoryOrderSchema,
  status: CategoryStatusSchema,
});


/** ---------- 类型导出 ---------- */

export type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
export type CategoryStatusParams = z.infer<typeof CategoryStatusParamsSchema>;
export type CategoryDeleteParams = z.infer<typeof CategoryDeleteParamsSchema>;
export type CategoryBulkDeleteQuery = z.infer<typeof CategoryBulkDeleteQuerySchema>;
export type CategoryUpdateParams = z.infer<typeof CategoryUpdateParamsSchema>;
export type CategoryCreateBody = z.infer<typeof CategoryCreateBodySchema>;
export type CategoryUpdateBody = z.infer<typeof CategoryUpdateBodySchema>;
