// import { PhotoController } from "../../controller/Photo.controller";
// import { Router } from "express";
// import { albumImageUploader, handleUploadError } from '../../utils/multer-config'

// const router: Router = Router();

// router.get('/', PhotoController.getPhotoList);
// router.post('/',
//     albumImageUploader.array('photos', 20), // 最多上传20张图片
//     PhotoController.uploadPhotos,
//     handleUploadError,
// );
// router.put('/:id', PhotoController.updatePhoto);
// router.delete('/:id', PhotoController.deletePhoto);
// router.post('/:id/set-cover', PhotoController.setCoverPhoto);

// export default router;