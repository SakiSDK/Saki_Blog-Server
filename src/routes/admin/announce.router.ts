import { Router } from 'express';
import { AnnounceAdminController } from '@/controller/admin/Announce.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import {
  AnnounceListQuerySchema,
  AnnounceCreateBodySchema,
  AnnounceUpdateBodySchema,
  AnnounceIdParamSchema,
  AnnounceBulkDeleteQuerySchema
} from '@/schemas/announce/announce.admin';

const router: Router = Router();

/** 获取公告列表 */
router.get('/', zodValidate({ query: AnnounceListQuerySchema }), AnnounceAdminController.getList);

/** 获取单个公告详情 */
router.get('/:id', zodValidate({ params: AnnounceIdParamSchema }), AnnounceAdminController.getById);

/** 创建公告 */
router.post('/', zodValidate({ body: AnnounceCreateBodySchema }), AnnounceAdminController.create);

/** 更新公告 */
router.put('/:id', zodValidate({
  params: AnnounceIdParamSchema,
  body: AnnounceUpdateBodySchema
}), AnnounceAdminController.update);

/** 批量删除公告 */
router.delete('/bulk', zodValidate({ query: AnnounceBulkDeleteQuerySchema }), AnnounceAdminController.bulkDelete);

/** 删除单个公告 */
router.delete('/:id', zodValidate({ params: AnnounceIdParamSchema }), AnnounceAdminController.delete);

export default router;
