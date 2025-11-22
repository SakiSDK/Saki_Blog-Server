import { Router } from "express";
import { TagController } from "../../controller/Tag.controller";

const router: Router = Router();

router.get('/', TagController.getAdminTagList);
router.post('/', TagController.createTag);
router.delete('/:id', TagController.deleteTag);
router.put('/:id', TagController.updateTag);

export default router;