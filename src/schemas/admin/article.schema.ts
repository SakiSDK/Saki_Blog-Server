import { z } from 'zod';
import { zStr, zId } from '../base.schema';


export const ArticleCreateBodySchema = z.object({
  /** 作者 ID */
  authorId: zStr.length(6, '用户短 ID 必须为 6 个字符').describe('用户短 ID'),
  /** 文章标题 */
  title: zStr.min(1).max(255).describe('文章标题'),
  /** 文章描述 */
  description: zStr.max(255).optional().describe('文章描述'),
  /** 文章状态 */
  status: z.enum(['draft', 'published']).default('draft'),
  /** 文章分类ID */
  categories: z.array(zId)
    .max(3, '最多允许添加 3 个分类')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 3, '最多允许添加 3 个分类')
    .refine(ids => ids.every(id => id > 0), '分类 ID 不能小于 1')
    .describe('文章分类ID列表'),
  /** 文章标签ID列表 */
  tags: z.array(zId)
    .max(10, '最多允许添加 10 个标签')
    .transform(ids => [...new Set(ids)]) // 自动去重
    .refine(ids => ids.length <= 10, '最多允许添加 10 个标签')
    .refine(ids => ids.every(id => id > 0), '标签 ID 不能小于 1')
    .optional()
    .describe('文章标签ID列表'),
  /** 是否允许评论 */
  allowComment: z.boolean().default(true).describe('是否允许评论'),
  /** 封面图片 */
  coverPath: zStr.optional().describe('封面图片'),
  /** 优先级 */
  priority: z.number().int().min(0).max(100).default(0).describe('优先级'),
  /** 文章内容 */
  content: zStr.describe('文章内容'),
  /** 文章内图片 */
  imagePaths: z.array(zStr).optional().describe('文章内图片'),
})