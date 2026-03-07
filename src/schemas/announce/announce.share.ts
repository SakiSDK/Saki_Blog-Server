import { z } from 'zod';
import { zDate, zId, zStr } from '../base.schema';



/** ---------- 公告基础类型 ---------- */
/** 公告Id */
export const AnnounceIdSchema = zId.describe('公告ID');
/** 公告内容 */
export const AnnounceContentSchema = zStr.describe('公告内容');
/** 公告类型 */
export const AnnounceTypeSchema = z.enum(['notice', 'update', 'reminder', 'news', 'maintenance']).describe('公告类型');
/** 优先级 */
export const AnnouncePrioritySchema = z.enum(['high', 'medium', 'low']).describe('优先级');
/** 公告创建时间 */
export const AnnounceCreateTimeSchema = zDate.describe('公告创建时间');
