import { Router } from 'express';
import {CategoryController} from '../../controller/admin/Category.controller';
import { zodValidate } from '@/middlewares/zodValidate';
import {
  CategoryBulkDeleteQuerySchema, CategoryListQuerySchema,
  CategoryCreateBodySchema,
  CategoryStatusParamsSchema
} from '../../schemas/admin/category.schema';
import { TagDeleteParamsSchema } from '@/schemas/admin/tag.schema';


const router: Router = Router();

router.post(
  '/',
  zodValidate({
    body: CategoryCreateBodySchema
  }),
  CategoryController.createCategory
)
router.get(
  '/',
  zodValidate({
    query: CategoryListQuerySchema
  }),
  CategoryController.getCategoryList
);
router.get(
  '/all',
  zodValidate({
    query: CategoryListQuerySchema
  }),
  CategoryController.getAllCategories
);
router.patch(
  '/:id/status',
  zodValidate({
    params: CategoryStatusParamsSchema
  }),
  CategoryController.toggleTagStatus
);
router.put(
  '/:id',
  zodValidate({
    params: CategoryStatusParamsSchema
  }),
  CategoryController.updateCategory
);
router.delete(
  '/:id',
  zodValidate({
    params: TagDeleteParamsSchema
  }),
  CategoryController.deleteCategory
);
router.delete(
  '/bulk',
  zodValidate({
    query: CategoryBulkDeleteQuerySchema
  }),
  CategoryController.bulkDeleteCategory
);



export default router;