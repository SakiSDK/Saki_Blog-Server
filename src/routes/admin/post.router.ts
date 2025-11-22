// src/routes/postAdminRoute.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PostController } from '../../controller/Post.controller'
import { coverUploader, createUploader, handleUploadError, tempStoragePaths } from '../../utils/multer-config';
import multer from 'multer';

const router: Router = Router();

// 配置multer存储（临时目录，与控制器逻辑一致）
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 根据字段名区分存储目录
        const dest = file.fieldname === 'cover' ? tempStoragePaths.cover : 
                    file.fieldname === 'images' ? tempStoragePaths.images : 
                    tempStoragePaths.content;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop() || '';
        const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`; // 唯一文件名
        cb(null, filename);
    }
});

// 2. 上传文件（封面/内图/内容）
router.post(
    '/upload/:type', // type: cover/image/content
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { type } = req.params;
            console.log("type: ", type);
            if (!['cover', 'images', 'content'].includes(type)) {
                throw new Error('文件类型必须是cover（封面）、image（内图）或content（内容）');
            }
            // 获取上传器并执行上传
            const uploader = createUploader(
                'draft',
                type as 'cover' | 'images' | 'content'
            );
            uploader(req, res, next);
        } catch (error: any) {
            next(error);
        }
    },
    handleUploadError, // 上传错误处理
    PostController.uploadFile
);
router.post('/upload-delete', PostController.deleteTempImages);


router.post(
    '/upload-complete',
    coverUploader.single('cover'),
    handleUploadError,
    PostController.uploadCompleteArticle
);


router.post(
    '/upload-draft',
    coverUploader.single('cover'),
    handleUploadError,
    PostController.uploadDraftArticle
)

// 删除文章及其对应的关联
router.delete('/:id', PostController.deletePostWithAssociations);

// 获取文章列表
router.get('/', PostController.getAdminPostList);



export default router;