import {z} from 'zod';
import { zStr } from '../base.schema';

/** ---------- 基础字段类型 ---------- */
/** 文章短ID */
const ArticleShortIdSchema = zStr.length(6, '摘要短 ID 长度必须为 6').describe("摘要 ID")

/** 摘要查询参数 */
export const ArticleShortIdParamsSchema = z.object({
  shortId: ArticleShortIdSchema,
})


/** ---------- 类型推导 ---------- */
/** 摘要查询参数 */
export type SummaryShortIdParams = z.infer<typeof ArticleShortIdSchema>;