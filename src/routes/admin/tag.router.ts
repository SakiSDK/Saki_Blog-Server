import {
  Router
} from "express";
import {
  zodValidate
} from '../../middlewares/zodValidate'
import {
  TagBulkDeleteQuerySchema, TagListQuerySchema,
  TagDeleteParamsSchema, TagStatusParamsSchema, TagUpdateParamasSchema,
  TagUpdataBodySchema, TagCreateBodySchema,
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
router.get(
  '/all',
  TagController.getAllTags
)
router.get(
  '/search',
  zodValidate({
    query: TagListQuerySchema
  }),
  TagController.searchTag
)
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
  '/bulk',
  zodValidate({
    query: TagBulkDeleteQuerySchema
  }),
  TagController.bulkDeleteTag
)
router.delete(
  '/:id',
  zodValidate({
    params: TagDeleteParamsSchema
  }),
  TagController.deleteTag
)
router.put(
  '/:id',
  zodValidate({
    params: TagUpdateParamasSchema,
    body: TagUpdataBodySchema
  }),
  TagController.updateTag
)

export default router;  