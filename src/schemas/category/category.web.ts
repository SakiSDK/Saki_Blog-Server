import { z } from 'zod';
import { zPageNum, zPageSize } from '../base.schema';

/** ---------- 查询参数 ---------- */


/** 分类列表查询参数 (Web) */
export const CategoryListQuerySchema = z.object({
  page: zPageNum.describe("页码"),
  pageSize: zPageSize.describe("每页数量"),
});


/** ---------- 类型导出 ---------- */
export type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
