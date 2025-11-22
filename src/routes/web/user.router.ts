import { avatarUploader, handleUploadError } from "../../utils/multer-config";
import { UserController } from "../../controller/User.controller";
import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth";

const router: Router = Router();

// 更新个人信息
router.put('/save-profile/:shortId', authenticateToken, UserController.saveProfile);

// 上传头像
router.post(
    '/upload-avatar/:shortId',
    authenticateToken,
    avatarUploader.single('avatar'),
    UserController.updateAvatar,
    handleUploadError
);

// 重置头像
router.post('/reset-avatar/:shortId', authenticateToken, UserController.resetAvatar);

export default router;