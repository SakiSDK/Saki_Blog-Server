import { zodValidate } from '@/middlewares/zodValidate';
import {Router} from 'express';
import { AnnounceController } from '@/controller/web/Announce.controller';
import { AnnounceListQuerySchema, AnnounceIdParamsSchema } from '@/schemas/announce/announce.web';



const router: Router = Router();

/** 
 * 获取公告列表
 * @route GET /web/announce
 * @group web - 公告管理
 */
router.get(
  '/',
  zodValidate({
    query: AnnounceListQuerySchema,
  }),
  AnnounceController.getAnnounceList
);

/** 
 * 获取公告详情
 * @route GET /web/announce/:id
 * @group web - 公告管理
 */
router.get(
  '/:id',
  zodValidate({
    params: AnnounceIdParamsSchema,
  }),
  AnnounceController.getAnnounceDetail
);


export default router;