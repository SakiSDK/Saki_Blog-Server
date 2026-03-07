import { Router } from "express"; 
import { HotTagQuerySchema, TagListQuerySchema } from '@/schemas/tag/tag.web'
import { TagController } from "@/controller/web/Tag.controller";
import { zodValidate } from '@/middlewares/zodValidate'


const router: Router = Router();

// 获取标签列表（GET /api/v1/web/tag）
router.get('/', zodValidate({
  query: TagListQuerySchema
}),  TagController.getTagList);
// 获取热门标签
router.get('/hot', zodValidate({
  query: HotTagQuerySchema
}), TagController.getHotTags)

export default router;
