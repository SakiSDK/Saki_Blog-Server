// import { NextFunction, Request, Response } from 'express';
// import {  CategoryService } from '../services/Category.service';
// import Joi from 'joi';
// import camelcaseKeys from 'camelcase-keys'
// import { BadRequestError } from '../utils/errors';
// import { createCategorySchmea, deleteCategorySchmea, getAdminCategoryListSchema, getWebCategoryListSchema, updateCategoryParamsSchema, updateCategorySchmea } from '../validators/category.schema';


// /**
//  * 分类控制器：处理与分类相关的HTTP请求，包括创建、删除、查询、更新等操作
//  * 职责：接收客户端请求，进行参数验证，调用服务层处理业务逻辑，返回响应结果
//  */
// export class CategoryController {
//         /**
//      * 创建分类
//      * @param req - Express请求对象，包含客户端提交的分类信息（name, description, order）
//      * @param res - Express响应对象，用于返回创建结果
//      * @param next - Express下一步中间件函数
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 验证请求体参数合法性，调用CategoryService创建分类，返回创建成功的分类信息
//      */
//     public static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
//         try {
//             // 验证请求参数
//             const { error, value } = createCategorySchmea.validate(req.body, {});
//             if (error) {
//                 throw new BadRequestError(error.message);
//             }

//             // 调用服务层创建分类
//             const category = await CategoryService.createCategory({
//                 ...value,
//             });


//             res.status(201).json({
//                 message: `分类字段(${category.name})创建成功`,
//                 data: camelcaseKeys(
//                     category.get({ plain: true }),
//                     { deep: true }
//                 )
//             });

//         } catch (error: any) {
//             res.status(error.status).json({
//                 message: error.message,
//             });
//         }
//     }

//     /**
//      * 删除分类
//      * @param req - Express请求对象，包含URL参数中的分类ID（id）
//      * @param res - Express响应对象，用于返回删除结果
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 验证URL参数中的分类ID合法性，调用CategoryService删除指定分类，返回删除结果
//      */
//     public static async deleteCategory(req: Request, res: Response): Promise<void> {
//         try {
//             const { error, value } = deleteCategorySchmea.validate(req.params);
//             if(error) throw new BadRequestError(error.message);
//             console.log('要删除的VALUE分类字段ID: ', value.id)
//             const { message } = await CategoryService.deleteCategory(Number(value.id));
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
//      * 获取Web端分类列表
//      * @param req - Express请求对象，包含查询参数（page, limit）
//      * @param res - Express响应对象，用于返回分类列表
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 接收分页参数，调用CategoryService获取分类列表，返回列表数据（当前data字段待完善）
//      */
//     // public static async getWebCategoryList(req: Request, res: Response): Promise<void> {
//     //     try {
//     //         // 验证查询参数
//     //         const { error, value } = getWebCategoryListSchema.validate(req.query);
//     //         if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');
            
//     //         // 调用服务层获取分类列表
//     //         const { categories, total, page, pageSize, totalPages } = await CategoryService.getCategoryList({
//     //             page: Number(value.page),
//     //             limit: Number(value.limit),
//     //         });

//     //         // 返回格式化结果
//     //         res.status(200).json({
//     //             message: '获取分类字段列表成功',
//     //             data: categories.map((category) => {
//     //                 const cg = category.get({ plain: true })
//     //                 const cleanCategory = {
//     //                     id: cg.id,
//     //                     name: cg.name,
//     //                     description: cg.description,
//     //                     order: cg.order,
//     //                     postCount: cg.post_count,
//     //                 }
//     //                 return camelcaseKeys( cleanCategory, { deep: true } )
//     //             }),
//     //             pagination: {
//     //                 total,
//     //                 page,
//     //                 pageSize,
//     //                 totalPages
//     //             }
//     //         })
//     //     }catch (error: any) {
//     //         res.status(error.status || 500).json({
//     //             message: error.message || '获取分类字段列表失败',
//     //         });
//     //     }
//     // }
    
//     /**
//      * 获取管理员端分类列表
//      * @param req - Express请求对象，包含多种查询参数（筛选条件、分页、排序）
//      * @param res - Express响应对象，用于返回分类列表及分页信息
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 支持多条件筛选（id, name等）、分页和排序，调用服务层获取数据后返回格式化结果
//      */
//     // public static async getAdminCategoryList(req: Request, res: Response): Promise<void> {
//     //     try {
//     //         // 验证查询参数
//     //         const { error, value } = getAdminCategoryListSchema.validate(req.query);
//     //         if (error) {
//     //             throw new BadRequestError(error.message);
//     //         }

//     //         // 调用服务层获取分类列表
//     //         const {
//     //             categories,
//     //             total,
//     //             page,
//     //             pageSize,
//     //             totalPages
//     //         } = await CategoryService.getCategoryList(value);

//     //         // 返回格式化结果
//     //         res.status(200).json({
//     //             message: '获取分类字段列表成功',
//     //             data: categories.map(
//     //                 category => camelcaseKeys(category.get({plain: true}), { deep: true })
//     //             ),
//     //             pagination: {
//     //                 page,
//     //                 pageSize,
//     //                 total,
//     //                 totalPages
//     //             }
//     //         });
//     //     } catch (error: any) {
//     //         console.error(error)
//     //         res.status(error.status || 500).json({
//     //             message: error.message || '获取分类字段列表失败',
//     //         }); 
//     //     }
//     // }

//     /**
//      * 更新分类
//      * @param req - Express请求对象，包含URL参数中的分类ID和请求体中的更新数据
//      * @param res - Express响应对象，用于返回更新结果
//      * @param next - Express下一步中间件函数
//      * @returns 无返回值，通过res发送JSON响应
//      * @description 分别验证URL参数中的ID和请求体中的更新数据，调用服务层更新分类并返回结果
//      */
//     public static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
//         try {
//             // 验证URL参数
//             const { error: paramsError, value: paramsValue } = updateCategoryParamsSchema.validate(req.params);
//             if (paramsError) throw new BadRequestError(paramsError.message);

//             // 验证请求体数据
//             const { error: bodyError, value: bodyValue } = updateCategorySchmea.validate(req.body);
//             if (bodyError) {
//                 throw new BadRequestError(bodyError.message);
//             }
//             // 调用服务层更新分类
//             const category = await CategoryService.updateCategory(Number(paramsValue.id), bodyValue);
            
//             // 返回格式化结果
//             res.status(200).json({
//                 message: '修改分类字段成功',
//                 data: camelcaseKeys(category.get({plain: true}), { deep: true })
//             });
//         } catch (error: any) {
//             console.error(error)
//             res.status(error.status || 500).json({
//                 message: error.message || '修改分类字段失败',
//             });
//         }
//     }
// }

