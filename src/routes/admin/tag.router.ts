import {
  Router
} from "express";
import {
  zodValidate
} from '../../middlewares/zodValidate'
import {
  TagBulkDeleteQuerySchema,
  TagCreateBodySchema, TagListQuerySchema, TagStatusParamsSchema
} from '../../schemas/admin/tag.schema';
import {
  TagController
} from '../../controller/admin/Tag.controller';


const router: Router = Router();

router.get(
  '/',
  // 校验参数
  zodValidate({
    query: TagListQuerySchema
  }),
  TagController.getTagList
);
router.patch(
  '/:id/status',
  zodValidate({
    params: TagStatusParamsSchema
  }),
  TagController.toggleTagStatus 
)
router.post(
  '/',
  zodValidate({
    body: TagCreateBodySchema
  }),
  TagController.createTag
)
router.delete(
  '/:id',
  zodValidate({
    params: TagStatusParamsSchema
  }),
  TagController.deleteTag
)
router.delete(
  '/bulk',
  zodValidate({
    query: TagBulkDeleteQuerySchema
  }),
  TagController.bulkDeleteTag
)

export default router;  