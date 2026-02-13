// import { getAdminAlbumListSchema, getWebAlbumListSchema, setAlbumCoverParamsSchema, setAlbumCoverSchema, updateALbumParamsSchema, updateAlbumSchema } from '../validators/album.schema';
// import { Request, Response } from 'express'
// import { AlbumService } from '../services/Album.service'
// import { BadRequestError } from '../utils/errors'
// import Joi from 'joi'
// import { config } from '../config/index'
// import { createAlbumSchema, deleteAlbumSchema, getWebAlbumDetailSchema } from '../validators/album.schema'


// /**
//  * AlbumController
//  * -------------------------------------------------------
//  * 📘 相册模块控制器
//  * 负责处理与相册相关的所有接口逻辑，包括：
//  * - 相册创建 / 删除 / 更新
//  * - 获取相册列表（前台 / 后台）
//  * - 设置相册封面
//  * -------------------------------------------------------
//  */
// export class AlbumController {
//     /**
//      * 创建相册
//      * 
//      * 接口功能：创建一个新的相册
//      * 请求体参数：
//      * - name: 相册名称（必填）
//      * - title: 相册标题（选填）
//      * - description: 相册描述（选填）
//      * - cover_photo_id: 封面图片ID（选填）
//      * - cover_photo_url: 封面图片URL（选填）
//      * 返回结果：创建成功的相册对象
//      */
//     static async createAlbum(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证参数
//             const { error, value } = createAlbumSchema.validate(req.body)
//             if (error) {
//                 throw new BadRequestError(error.message)
//             }

//             // 调用服务层处理相册创建逻辑
//             const album = await AlbumService.createAlbum(value)

//             // 返回结果
//             res.status(201).json({
//                 message: '相册创建成功',
//                 data: album.get({ plain: true }),
//             })
//         } catch (error: any) {
//             console.error('相册创建失败', error)
//             res.status(error.status).json({
//                 message: error.message,
//             })
//         }
//     }

//     /**
//      * 删除相册
//      * 
//      * 接口功能：根据ID删除指定相册
//      * 请求参数：
//      * - id: 相册ID
//      * 返回结果：删除成功提示信息
//      */
//     public static async deleteAlbum(req: Request, res: Response) {
//         try {
//             // 验证参数
//             const { error, value } = deleteAlbumSchema.validate(req.params);
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             // 调用服务层处理相册删除逻辑
//             const { message } = await AlbumService.deleteAlbum(parseInt(value.id))
            
//             // 返回结果
//             res.status(200).json({
//                 message: message || '相册删除成功',
//             })
//         } catch (error: any) {
//             console.error('相册删除失败', error)
//             res.status(error.status).json({
//                 message: error.message || '相册删除失败'
//             })
//         }
//     }

//     /**
//      * 获取前台相册详情
//      * 
//      * 接口功能：根据ID获取相册详情（用于前台展示）
//      * 请求参数：
//      * - id: 相册ID
//      * 返回结果：相册详情对象
//      */
//     public static async getWebAlbumDetail(req: Request, res: Response) { 
//         try {
//             const { error, value } = getWebAlbumDetailSchema.validate(req.params)
//             const album = await AlbumService.getAlbumDetail(Number(value.id))
//             res.status(200).json({
//                 data: album?.get({ plain: true }),
//                 message: '获取成功',
//             });
//         } catch (error: any) {
//             res.status(error.status||400).json({
//                 message: error.message || '获取失败',
//             })
//         }
//     }

//     /**
//      * 获取前台相册列表
//      * 
//      * 接口功能：分页获取相册列表（仅前台）
//      * 请求参数：
//      * - page: 页码（默认 1）
//      * - limit: 每页数量（默认 10）
//      * 返回结果：分页相册列表 + pagination 信息
//      */
//     public static async getWebAlbumList(req: Request, res: Response) { 
//         try {
//             // 校验数据
//             const { error, value } = getWebAlbumListSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message);

//             const { albums, total, page, pageSize, totalPages } = await AlbumService.getAlbumList({
//                 page: Number(value.page),
//                 limit: Number(value.limit),
//             });

//             res.status(200).json({
//                 message: '获取相册列表成功',
//                 data: albums.map((album) => {
//                     const alb = album.get({ plain: true });
//                     const cleanAlbum = {
//                         id: alb.id,
//                         name: alb.name,
//                         slug: alb.slug,
//                         title: alb.title,
//                         description: alb.description,
//                         cover_path: `${alb.cover_photo_url}`,
//                         photo_count: alb.photo_count,
//                     }
//                     return cleanAlbum;
//                 }),
//                 pagination: {
//                     total,
//                     page,
//                     pageSize,
//                     totalPages,
//                 }
//             })

//         }catch (error: any) {
//             res.status(error.status || 400).json({
//                 message: error.message || '相册列表获取失败'
//             })
//         }
//     }

//     /**
//      * 获取后台相册列表（支持筛选 + 排序）
//      * 
//      * 接口功能：分页查询相册，支持筛选与排序（管理端）
//      * 请求参数：
//      * - id / name / slug / title / description
//      * - page / limit / orderBy / sort
//      * 返回结果：分页相册数据 + pagination 信息
//      * -------------------------------------------------------
//      */
//     public static async getAdminAlbumList(req: Request, res: Response) { 
//         try {
//             console.log(req.query);
//             // 校验数据
//             const { error, value } = getAdminAlbumListSchema.validate(req.query);
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             // 调用服务层处理相册列表查询逻辑
//             const { albums, total, page, pageSize, totalPages } = await AlbumService.getAlbumList(value);

//             // 返回结果
//             res.status(200).json({
//                 data: albums.map(album => (
//                     album.get({plain: true})
//                 )),
//                 pagination: {
//                     total,
//                     totalPages,
//                     page,
//                     pageSize,
//                 },
//                 message: '获取相册列表成功',
//             })
//         } catch (error: any) {
//             console.error('获取相册列表失败', error.message)
//             res.status(error.status).json({
//                 message: error.message,
//             })
//         }
//     }

//     /**
//      * 更新相册信息
//      * 
//      * 接口功能：根据ID更新相册基本信息
//      * 请求参数：
//      * - id: 相册ID
//      * - body: 相册要更新的字段
//      * 返回结果：更新后的相册对象
//      */
//     public static async updateAlbum(req: Request, res: Response): Promise<void> { 
//         try {
//             const { error: paramsError } = updateALbumParamsSchema.validate({
//                 id: req.params.id
//             })
//             if (paramsError) {
//                 throw new BadRequestError(paramsError.message)
//             }

//             const { error: bodyError, value: bodyValue } = updateAlbumSchema.validate(req.body)
//             if (bodyError) {
//                 throw new BadRequestError(bodyError.message)
//             }

//             const album = await AlbumService.updateAlbum(Number(req.params.id), bodyValue)

//             res.status(200).json({
//                 data: camelcaseKeys(album.get({plain: true}), {deep: true}),
//                 message: '更新相册成功'
//             })
//         } catch (error: any) {
//             console.error(error);
//             res.status(error.status || 500).json({
//                 message: error.message
//             });
//         }
//     }

//     /**
//      * 设置相册封面
//      * 
//      * 接口功能：为指定相册设置封面图片
//      * 请求参数：
//      * - id: 相册ID（路径参数）
//      * - photoId: 图片ID（body）
//      * - photoUrl: 图片URL（body）
//      * 返回结果：设置成功的相册对象
//      */
//     public static async setAlbumCover(req: Request, res: Response): Promise<void> {
//         try {
//             const { error: paramsError } = setAlbumCoverParamsSchema.validate({
//                 id: req.params.id
//             });
//             if (paramsError) {
//                 throw new BadRequestError(paramsError.message);
//             }

//             const { error: bodyError, value: bodyValue } = setAlbumCoverSchema.validate(req.body);
//             if (bodyError) {
//                 throw new BadRequestError(bodyError.message);
//             }

//             const album = await AlbumService.setAlbumCover(Number(req.params.id), bodyValue.photoId, bodyValue.photoUrl);
            
//             res.json({
//                 message: '设置相册封面成功',
//                 album,
//             });
//         } catch (error: any) {
//             res.status(error.statusCode || 500).json({
//                 message: error.message,
//             });
//         }
//     }
// }