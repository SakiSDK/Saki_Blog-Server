import { Router } from 'express';
import { CategoryController } from '../../controller/Category.controller';

const router: Router = Router();

router.get('/', CategoryController.getAdminCategoryList);
router.post('/', CategoryController.createCategory);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

export default router;