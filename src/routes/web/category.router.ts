import { CategoryController } from "../../controller/Category.controller";
import { Router } from "express";

const router: Router = Router();

// 获取分类列表（GET /api/v1/web/category）
router.get('/', CategoryController.getWebCategoryList);

export default router;