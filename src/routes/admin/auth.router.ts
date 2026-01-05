import { AuthController } from '../../controller/admin/Auth.controller';
import { Router } from 'express';

const router: Router = Router();

/** 获取唯一 nonce（用于防重放攻击） */
router.post('/login', AuthController.login);
router.get('/nonce', AuthController.getNonce);
/** 后台管理系统登录 */

export default router;