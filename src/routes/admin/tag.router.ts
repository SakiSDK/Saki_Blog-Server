import {
  Router
} from "express";
import {
  zodValidate
} from '@/middlewares/zodValidate'
import {
  TagBulkDeleteQuerySchema, TagListQuerySchema,
  TagDeleteParamsSchema, TagStatusParamsSchema, TagUpdateParamasSchema,
  TagUpdataBodySchema, TagCreateBodySchema,
} from '@/schemas/admin/tag.schema';
import {
  TagController
} from '@/controller/admin/Tag.controller';


const router: Router = Router();

/**
 * 获取标签列表（分页 / 条件查询）
 * GET /admin/tag
 */
router.get(
  '/',
  // 校验参数
  zodValidate({
    query: TagListQuerySchema
  }),
  TagController.getTagList
);

/**
 * 获取所有标签（通常用于下拉框 / 选择器）
 * GET /admin/tag/all
 */
router.get(
  '/all',
  TagController.getAllTags
)

/**
 * 搜索标签（根据名称/描述）
 * GET /admin/tag/search
 */
router.get(
  '/search',
  zodValidate({
    query: TagListQuerySchema
  }),
  TagController.searchTag
)

/**
 * 更新标签状态
 * PATCH /admin/tag/:id/status
 */
router.patch(
  '/:id/status',
  zodValidate({
    params: TagStatusParamsSchema
  }),
  TagController.toggleTagStatus 
)

/**
 * 创建标签
 * POST /admin/tag
 */
router.post(
  '/',
  zodValidate({
    body: TagCreateBodySchema
  }),
  TagController.createTag
)

/**
 * 批量删除标签
 * DELETE /admin/tag/bulk
 */
router.delete(
  '/bulk',
  zodValidate({
    query: TagBulkDeleteQuerySchema
  }),
  TagController.bulkDeleteTag
)

/**
 * 删除标签
 * DELETE /admin/tag/:id
 */
router.delete(
  '/:id',
  zodValidate({
    params: TagDeleteParamsSchema
  }),
  TagController.deleteTag
)

/**
 * 更新标签
 * PUT /admin/tag/:id
 */
router.put(
  '/:id',
  zodValidate({
    params: TagUpdateParamasSchema,
    body: TagUpdataBodySchema
  }),
  TagController.updateTag
)

export default router;  