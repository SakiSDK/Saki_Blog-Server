import { TagController } from "../../controller/Tag.controller";
import { Router } from "express";

const router: Router = Router();

// 获取标签列表（GET /api/v1/web/tag）
router.get('/', TagController.getWebTagList);

export default router;