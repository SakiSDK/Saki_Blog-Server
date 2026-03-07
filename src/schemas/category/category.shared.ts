import { z } from 'zod';
import { zStr, zId, zInteger } from '../base.schema';

/** ---------- 基础字段 ---------- */

/** 分类ID */
export const CategoryIdSchema = zId.describe('分类ID');

/** 分类名称 */
export const CategoryNameSchema = zStr
  .max(50, { message: '分类名称不能超过50个字符' })
  .trim()
  .nonempty({ message: '分类名称不能为空' })
  .describe('分类名称');

/** 分类描述 */
export const CategoryDescriptionSchema = zStr
  .trim()
  .max(256, { message: '分类描述不能超过256个字符' })
  .or(z.literal(""))
  .nullable()
  .optional()
  .describe('分类描述');

/** 分类排序 */
export const CategoryOrderSchema = zInteger
  .min(0, { message: '排序值不能小于0' })
  .max(999, { message: '排序值不能大于999' })
  .default(0)
  .optional()
  .describe('分类排序');

/** 分类状态 */
export const CategoryStatusSchema = z.enum(['active', 'inactive'], { message: '只能选择激活或者未激活' })
  .describe('分类状态');

/** 分类别名 (如果有) */
export const CategorySlugSchema = zStr.describe('分类别名');


/** ---------- 组合结构 ---------- */

/** 基础分类对象 */
export const CategorySchema = z.object({
  id: CategoryIdSchema,
  name: CategoryNameSchema,
  description: CategoryDescriptionSchema,
  order: CategoryOrderSchema,
  status: CategoryStatusSchema,
  // slug: CategorySlugSchema, // 暂时根据 admin schema 没看到 slug，先保留
});
