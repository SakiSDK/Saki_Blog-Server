import { z } from 'zod';
import { zStr, zId } from '../base.schema';

/** ---------- 基础字段 ---------- */

/** 标签ID */
export const TagIdSchema = zId.describe('标签ID');

/** 标签名称 */
export const TagNameSchema = zStr
  .max(50, { message: '标签名称不能超过50个字符' })
  .trim()
  .nonempty({ message: '标签名称不能为空' })
  .describe('标签名称');

/** 标签描述 */
export const TagDescriptionSchema = z
  .string({ message: '必须是文本' })
  .trim()
  .max(50, { message: '标签描述不能超过50个字符' })
  .or(z.literal(""))
  .nullable()
  .optional()
  .describe('标签描述');

/** 标签排序 */
export const TagOrderSchema = z.number()
  .int()
  .min(0, { message: '排序值不能小于0' })
  .max(999, { message: '排序值不能大于999' })
  .default(0)
  .optional()
  .describe('标签排序');

/** 标签状态 */
export const TagStatusSchema = z.enum(['active', 'inactive'], { message: '只能选择激活或者未激活' })
  .describe('标签状态');

/** 标签别名 (如果有) */
export const TagSlugSchema = zStr.describe('标签别名');


/** ---------- 组合结构 ---------- */

/** 基础标签对象 */
export const TagSchema = z.object({
  id: TagIdSchema,
  name: TagNameSchema,
  description: TagDescriptionSchema,
  order: TagOrderSchema,
  status: TagStatusSchema,
  // slug: TagSlugSchema, // 暂时根据 admin schema 没看到 slug，先保留
});
