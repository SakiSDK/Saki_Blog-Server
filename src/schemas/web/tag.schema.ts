import { z } from 'zod'
import {
  zStr,
  zPageNum,
  zPageSize,
} from '../base.schema'


/** ---------- web 端 Tag Schema ---------- */
export const TagListParamsSchema = z.object({
  // 基础查询参数
  page: zPageNum.optional().describe("页码"),
  pageSize: zPageSize.optional().describe("每页数量"),
  keyword: zStr.max(50, "搜索关键字长度不能超过 50 个字符").optional().describe("搜索关键字"),
})
export const HotTagParamsSchema = z.object({
  pageSize: zPageSize.optional().describe("数量"),
  withPostCount: z.coerce.boolean().optional().describe("是否返回文章数量"),
})


export type TagListQuery = z.infer<typeof TagListParamsSchema>;
export type HotTagParams = z.infer<typeof HotTagParamsSchema>;