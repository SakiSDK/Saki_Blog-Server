// import { Request, Response } from 'express';
// import {  TagService } from '../services/Tag.service';
// import camelcaseKeys from 'camelcase-keys'
// import { BadRequestError } from '../utils/errors';
// import { createTagSchema, deleteTagSchema, getAdminTagListSchema, getWebTagListSchema, updateTagParamsSchema, updateTagSchema } from '../validators/tag.schema';


// export class TagController {
//     public static async createTag(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error, value } = createTagSchema.validate(req.body, {});
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             // 创建标签
//             const tag = await TagService.createTag({
//                 ...value,
//             });

//             // 返回创建成功的标签数据
//             res.status(201).json({
//                 message: `标签(${tag.name})创建成功`,
//                 data: camelcaseKeys(
//                     tag.get({ plain: true }),
//                     { deep: true }
//                 )
//             });
//         } catch (error: any) {
//             res.status(error.status).json({
//                 message: error.message,
//             });
//         }

//     }

//     public static async deleteTag(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error, value } = deleteTagSchema.validate(req.params);
//             if (error) throw new BadRequestError(error.message);
            
//             // 删除标签
//             const { message } = await TagService.deleteTag(Number(value.id));

//             // 返回删除成功的信息
//             res.status(200).json({
//                 message,
//             });
//         } catch (error: any) {
//             res.status(error.status || 500).json({
//                 message: error.message || '删除失败',
//             });
//         }

//     }

//     /**
//      * 获取Web端标签列表
//      * @param req - Express请求对象，包含查询参数（page, limit）
//      * @param res - Express响应对象，用于返回标签列表
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 接收分页参数，调用TagService获取标签列表，返回列表数据（当前data字段待完善）
//      */
//     public static async  getWebTagList(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error, value } = getWebTagListSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');
            
//             // 获取标签列表
//             const { tags, total, page, pageSize, totalPages } = await TagService.getTagList({
//                 page: Number(value.page),
//                 limit: Number(value.limit),
//             });

//             // 返回标签列表数据
//             res.status(200).json({
//                 message: '获取标签字段列表成功',
//                 data: tags.map((tag) => {
//                     const cg = tag.get({ plain: true })
//                     const cleanTag = {
//                         id: cg.id,
//                         name: cg.name,
//                         description: cg.description,
//                         order: cg.order,
//                         postCount: cg.post_count,
//                     }
//                     return camelcaseKeys( cleanTag, { deep: true } )
//                 }),
//                 pagination: {
//                     total,
//                     page,
//                     pageSize,
//                     totalPages
//                 }
//             })
//         }catch (error: any) {
//             res.status(error.status || 500).json({
//                 message: error.message || '获取标签字段列表失败',
//             });
//         }
//     }

//     public static async getAdminTagList(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error, value } = getAdminTagListSchema.validate(req.query);
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             // 获取标签列表
//             const {
//                 tags,
//                 total,
//                 page,
//                 pageSize,
//                 totalPages
//             } = await TagService.getTagList(value);

//             // 返回标签列表数据
//             res.status(200).json({
//                 message: '获取标签列表成功',
//                 data: tags.map(
//                     tag => camelcaseKeys(tag.get({plain: true}), { deep: true })
//                 ),
//                 pagination: {
//                     page,
//                     pageSize,
//                     total,
//                     totalPages
//                 }
//             });
//         } catch (error: any) {
//             console.error(error)
//             res.status(error.status || 500).json({
//                 message: error.message || '获取标签列表失败',
//             }); 
//         }

//     }

//     public static async updateTag(req: Request, res: Response): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error: paramsError, value: paramsValue } = updateTagParamsSchema.validate(req.params);
//             if (paramsError) throw new BadRequestError(paramsError.message);

//             // 验证请求参数
//             const { error: bodyError, value: bodyValue } = updateTagSchema.validate(req.body);
//             if (bodyError) {
//                 throw new BadRequestError(bodyError.message);
//             }

//             // 更新标签
//             const tag = await TagService.updateTag(Number(paramsValue.id), bodyValue);

//             // 返回更新成功的标签数据
//             res.status(200).json({
//                 message: '更新标签成功',
//                 data: camelcaseKeys(tag.get({plain: true}), { deep: true })
//             });
//         } catch (error: any) {
//             console.error(error)
//             res.status(error.status || 500).json({
//                 message: error.message || '更新标签失败',
//             });
//         }
//     }
// }

