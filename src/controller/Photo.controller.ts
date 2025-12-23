// import { Request, Response } from 'express'
// import { PhotoService } from '../services/Photo.service'
// import { BadRequestError } from '../utils/errors';
// import { generateThumbnail, getImageInfo } from '../utils/image';
// import { uploadBufferToOSS, uploadToOSS } from '../utils/upload';
// import { randomUUID } from 'crypto';
// import camelcaseKeys from 'camelcase-keys';
// import { config } from '../config/index';
// import {
//     uploadPhotosSchema, updatePhotoSchema, getPhotoListSchema,
//     updatePhotoParamsSchema, deletePhotoSchema, setCoverPhotoSchema,
//     getPhotosByAlbumIdSchema
// } from '../validators/photo.schema'



// export class PhotoController { 
//     // 批量上传中间件，配合前端上传组件(multer)
//     public static async uploadPhotos(req: Request, res: Response): Promise<void> {
//         // 创建一个用于回滚的函数数组
//         const rollbackFns: (() => Promise<void>)[] = []
//         try {
//             // 验证请求参数
//             const { error: formError, value: formValue } = uploadPhotosSchema.validate(req.body);
//             if (formError) {
//                 throw new BadRequestError(formError.message);
//             }
            
//             // 处理文件（必须上传至少一个文件）
//             const files = req.files as Array<Express.Multer.File>;
//             if (!files || files.length === 0) {
//                 throw new BadRequestError('请上传至少一张图片');
//             }
//             const photoDataList = await Promise.all(files.map(async (file, index) => {
//                 // 解析文件信息(格式，尺寸，大小)
//                 const fileInfo = await getImageInfo(file.buffer);   // 获取图片信息
//                 const format = fileInfo.type;               // 文件格式
//                 const size = Math.round(file.size / 1024);  // 文件大小
//                 const uniqueId = randomUUID();              // 生成唯一的文件名

//                 // 原图上传到OSS对象存储
//                 const {
//                     url: image_url,
//                     rollback: originalRollback
//                 } = await uploadToOSS(
//                     file,
//                     'uploads/images/albums/photos/original'
//                 )
//                 rollbackFns.push(originalRollback)

//                 // 生成缩略图并上传到OSS对象存储
//                 const thumbnailBuffer = await generateThumbnail(file.buffer, 200, 200);
//                 const {
//                     url: thumbnail_url,
//                     rollback: thumbnailRollback
//                 } = await uploadBufferToOSS(
//                     thumbnailBuffer,
//                     file.originalname, 
//                     'uploads/images/albums/photos/thumbnails'
//                 )
//                 rollbackFns.push(thumbnailRollback)

//                 // 生成标题
//                 const title = formValue.titlePrefix 
//                     ? `${formValue.titlePrefix}${index + 1}`
//                     : `${format.toUpperCase()} 图片 ${index + 1}`
//                 // 返回图片数据
//                 return {
//                     title,
//                     description: formValue.description,
//                     uploader: formValue.uploader,
//                     image_url,
//                     thumbnail_url,
//                     size,
//                     width: fileInfo.width,
//                     height: fileInfo.height,
//                     format,
//                 }
//             }))

//             // 创建图片
//             const photos = await PhotoService.createPhotos({
//                 album_id: formValue.album_id,
//                 photos: photoDataList.map(photo => ({
//                     ...photo,
//                     uploader: formValue.uploader,
//                 })),
//             })

//             res.status(201).json({
//                 message: `成功上传 ${photoDataList.length} 张图片`,
//                 data: photos.map(photo => (camelcaseKeys(photo.get({ plain: true }), { deep: true }))),

//             })
//         } catch (error: any) {
//             console.error('[PhotoController.uploadPhotos: 104]图片上传失败: ', error);
//             // 回滚 OSS 上传的文件
//             await Promise.allSettled(rollbackFns.map(fn => fn()))

//             res.status(error.status || 500).json({
//                 message: error.message || '上传图片失败',
//             })

//         }
//     }

//     // 获取图片列表
//     static async getPhotoList(req: Request, res: Response): Promise<void> { 
//         try {
//             const { error, value } = getPhotoListSchema.validate(req.query);
//             if (error) {
//                 throw new BadRequestError(error.message)
//             }
//             // 调用Service获取照片数据
//             const result = await PhotoService.getPhotoList(value);
//             // 返回成功列表
//             res.status(200).json({
//                 message: '获取照片列表成功',
//                 data: result.photos.map(
//                     photo => camelcaseKeys(photo.get({ plain: true }), { deep: true })
//                 ),
//                 pagination: {
//                     total: result.total,
//                     page: result.page,
//                     pageSize: result.pageSize,
//                     totalPages: result.totalPages,
//                 }
//             })
//         } catch (error: any) {
//             res.status(500).json({
//                 message: error.message || '获取照片列表失败',
//             })
//         }
//     }

//     // 更新指定照片信息
//     public static async updatePhoto(req: Request, res: Response): Promise<void> { 
//         try {
//             // 验证请求参数
//             const { error: paramsError, value: paramsValue } = updatePhotoParamsSchema.validate(req.params);
//             if (paramsError) throw new BadRequestError(paramsError.message);

//             // 验证请求体参数
//             const { error: bodyError, value: bodyValue } = updatePhotoSchema.validate(req.body);
//             if (bodyError) throw new BadRequestError(bodyError.message);
            
//             // 调用Service更新照片信息
//             const result = await PhotoService.updatePhoto(Number(paramsValue.id), bodyValue);

//             // 返回成功信息
//             res.status(200).json({
//                 message:`标题为${bodyValue.title}的图片信息更新成功`,
//                 data: result
//             })
//         } catch (error: any) {
//             res.status(500).json({
//                 message: error.message || '更新照片失败',
//             })
//         }
//     }

//     public static async deletePhoto(req: Request, res: Response) { 
//         try {
//             const { error, value } = deletePhotoSchema.validate(req.params)
//             if (error) {
//                 throw new BadRequestError(error.message || '删除图片失败')
//             }
//             const { message } = await PhotoService.deletePhoto(Number(value.id))

//             res.status(200).json({
//                 message,
//             })
//         } catch (error: any) {
//             console.error(`[PhotoController.deletePhoto] 照片删除失败：`, error)
//             res.status(error.status||500).json({
//                 message: error.message || '删除图片失败',
//             })
//         }
//     }

//     public static async setCoverPhoto(req: Request, res: Response) {
//         try {
//             const { error: paramsError, value: paramsValue } = setCoverPhotoSchema.validate(req.params)
//             if (paramsError) {
//                 throw new BadRequestError(paramsError.message)
//             }
//             const result = await PhotoService.setCoverPhoto(paramsValue.id)
//             res.status(200).json({
//                 message: result.message || '设置相册封面成功',
//                 data: result.data
//             })
//         }catch (error: any) {
//             res.status(error.status||500).json({
//                 message: error.message || '设置相册封面图片失败',
//             })
//         }
//     }

//     public static async getPhotosByAlbumId(req: Request, res: Response) { 
//         try {
//             const { error } = getPhotosByAlbumIdSchema.validate(req.params)
//             if (error) throw new BadRequestError(error.message)
//             const { album_id } = req.params;
//             const photos = await PhotoService.getPhotosByAlbumId(Number(album_id))
//             res.status(200).json({
//                 message: '获取相册图片列表成功',
//                 data: photos.map(photo => {
//                     const cleanPhoto = {
//                         ...photo.get({plain: true}),
//                         image_path: `${photo.image_path}`
//                     }
//                     return camelcaseKeys(cleanPhoto,{deep: true})
//                 })
//             })
//         } catch (error: any) {
//             res.status(error.status || 500).json({
//                 message: error.message || '获取相册图片失败',
//             })
//         }
//     }
// }