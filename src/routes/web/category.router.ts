import { CategoryController } from "../../controller/web/Category.controller";
import { Router } from "express";
import { CategoryListParamsSchema } from "../../schemas/web/category.schema";
import { zodValidate } from "../../middlewares/zodValidate";


const router: Router = Router();

// 获取分类列表（GET /api/v1/web/category）
router.get('/', zodValidate({
  query: CategoryListParamsSchema
}), CategoryController.getCategoryList);

export default router;