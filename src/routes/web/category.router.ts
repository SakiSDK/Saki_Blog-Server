import { Router } from "express";
import { CategoryController } from "../../controller/web/Category.controller";
import { CategoryListQuerySchema } from "../../schemas/category/category.web";
import { zodValidate } from "../../middlewares/zodValidate";


const router: Router = Router();

/** 
 * 获取分类列表
 * @route GET /web/category
 * @group web - 前台
 */
router.get('/', 
  zodValidate({
    query: CategoryListQuerySchema
  }),
  CategoryController.getCategoryList
);

export default router;
