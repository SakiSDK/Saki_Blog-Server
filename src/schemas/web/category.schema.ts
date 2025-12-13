import { z } from 'zod'
import {
  zOptionalStr,
  zSortableListQuery,
  zDateRangeQuery,
  zStr,
  zPageNum,
  zPageSize,
} from '../base.schema'


/** ---------- web 端 Cateogory Schema ---------- */
export const CategoryListParamsSchema = z.object({
  page: zPageNum.optional().describe("页码"),
  pageSize: zPageSize.optional().describe("每页数量"),
  keyword: zStr.max(50, "搜索关键字长度不能超过 50 个字符").optional().describe("搜索关键字"),
})


export type CategoryListParams = z.infer<typeof CategoryListParamsSchema>;