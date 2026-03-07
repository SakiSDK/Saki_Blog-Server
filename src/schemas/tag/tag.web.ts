import { z } from 'zod';
import { zPageNum, zPageSize } from '../base.schema';

/** ---------- 查询参数 ---------- */

/** 标签列表查询参数 (Web) */
export const TagListQuerySchema = z.object({
  page: zPageNum.describe("页码"),
  pageSize: zPageSize.describe("每页数量"),
});

/** 热门标签参数 */
export const HotTagQuerySchema = z.object({
  pageSize: zPageSize.describe("数量"),
  withPostCount: z.coerce.boolean().optional().describe("是否返回文章数量"),
})

/** ---------- 类型导出 ---------- */
export type TagListQuery = z.infer<typeof TagListQuerySchema>;
export type HotTagQuery = z.infer<typeof HotTagQuerySchema>;
