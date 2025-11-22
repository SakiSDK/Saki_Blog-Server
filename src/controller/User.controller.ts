import { saveProfileBodySchema, saveProfileParamsSchema, updateAvatarSchema } from '../validators/user.schema';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/User.service';
import { BadRequestError } from '../utils/errors';
import camelcaseKeys from 'camelcase-keys';
import {
    changePasswordBodySchema, changePasswordParamsSchema, createUserSchema,
    deleteUserSchema, getUserByIdSchema, getUserListSchema,
    updateUserBodySchema, updateUserParamsSchema
} from '../validators/user.schema';
import { ShortIdUtil } from '../utils/shortIdUtil';
import { compressImage } from '../utils/image';
import { uploadToOSS } from '../utils/upload';



/**
 * 用户控制器（Controller层）
 * ----------------------
 * 职责：接收客户端HTTP请求，进行参数校验、请求转发，接收服务层返回结果并格式化响应
 * 与服务层（UserService）解耦，不处理具体业务逻辑，仅负责请求/响应流程控制
 */
export class UserController {
    /**
     * 获取用户列表（支持分页、筛选）
     * 请求方式：GET
     * 请求路径：/users（示例，实际路由需在路由配置中绑定）
     * 查询参数：通过getUserListSchema校验（如page页码、pageSize每页条数、id用户ID筛选等）
     * 响应格式：返回驼峰命名的用户列表 + 分页元信息
     */
    static async getUserList(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { error, value } = getUserListSchema.validate(req.query);
            if (error) {
                throw new BadRequestError(error.message);
            }
            const {
                total,
                page,
                pageSize,
                totalPages,
                users,
            } = await UserService.getUserList({
                ...value,
                id: Number(value.id),
            });
            res.status(200).json({
                message: '获取用户列表成功',
                data: users.map(
                    user => camelcaseKeys(user.get({plain: true}), { deep: true })  // 传给前端的数据转化为驼峰命名
                ),
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages
                }
            });
        } catch (error: any) {
            console.error(error)
            res.status(error.status).json({
                message: error.message || '获取用户列表失败',
            })
        }
    }
    
    /**
     * 获取指定ID的用户详情
     * 请求方式：GET
     * 请求路径：/users/:id（示例）
     * 路径参数：id（用户ID，通过getUserByIdSchema校验）
     */
    static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { error, value } = getUserByIdSchema.validate(req.params);
            if (error) throw new BadRequestError(error.message);
            const user = await UserService.getUserById(value.id);
            res.status(200).json({
                message: '获取用户信息成功',
                data: camelcaseKeys(user.get({ plain: true }), { deep: true })
            });
        } catch (error: any) {
            res.status(error.status).json({
                message: error.message || '获取用户失败',
            })
        }
    }

    /**
     * 创建新用户
     * 请求方式：POST
     * 请求路径：/users（示例）
     * 请求体：用户信息（如用户名、密码、邮箱等，通过createUserSchema校验）
     * 响应状态：201 Created（资源创建成功标准状态码）
     */
    static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { error, value } = createUserSchema.validate(req.body);
            if(error) throw new BadRequestError(error.message);
            const user = await UserService.createUser(value);
            res.status(201).json({
                message: '用户创建成功',
                data: camelcaseKeys(user.get({plain: true}), {deep: true}),
            });
        } catch (error: any) {
            console.log(`[user.controller.createUser]: ${error.message}`)
            res.status(error.status).json({
                message: error.message || '用户创建失败',
            })
        }
    }

    /**
     * 更新指定ID的用户信息
     * 请求方式：PUT/PATCH（示例用PUT，全量更新；PATCH可用于部分更新）
     * 请求路径：/users/:id（示例）
     * 路径参数：id（用户ID，通过updateUserParamsSchema校验）
     * 请求体：待更新的用户字段（通过updateUserBodySchema校验，支持部分字段）
     */
    static async updateUser(req: Request, res: Response): Promise<void> { 
        try {
            // params参数验证
            const { error: paramsError, value: paramsValue } = updateUserParamsSchema.validate(req.params);
            if (paramsError) {
                throw new BadRequestError(paramsError.message);
            }

            // body参数验证
            const { error: bodyError, value: bodyValue } = updateUserBodySchema.validate(req.body);
            if (bodyError) {
                throw new BadRequestError(bodyError.message);
            }
            //过滤掉未定义的字段
            const user = await UserService.updateUser(Number(paramsValue.id), bodyValue);
            res.status(200).json({
                message: '更新用户成功',
                data: user
            });
        } catch (error: any) {
            res.status(error.status).json({
                message: error.message
            });
        }
    }

    /**
     * 删除指定ID的用户（逻辑删除/物理删除，由Service层决定）
     * 请求方式：DELETE
     * 请求路径：/users/:id（示例）
     * 路径参数：id（用户ID，通过deleteUserSchema校验）
     * 响应状态：204 No Content（成功无返回体，符合RESTful规范）
     */
    static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { error, value } = deleteUserSchema.validate(req.params);
            console.log('删除的用户: ', value.id)
            if(error) throw new BadRequestError(error.message);
            const { message } = await UserService.deleteUser(value.id);
            res.status(204).json({
                message: message || '用户已删除'
            });
        } catch (error: any) {
            res.status(error.status).json({
                message: error.message || '删除用户失败'
            })
        }
    }

    /**
     * 用户自助修改密码（需验证旧密码）
     * 请求方式：PATCH
     * 请求路径：/users/:id/password（示例）
     * 路径参数：id（用户ID，通过changePasswordParamsSchema校验）
     * 请求体：oldPassword（旧密码）、newPassword（新密码），通过changePasswordBodySchema校验
     */
    static async changePassword(req: Request, res: Response): Promise<void> {
        try {
            // params参数验证
            const { error: paramsError, value: paramsValue } = changePasswordParamsSchema.validate(req.params);
            if (paramsError) throw new BadRequestError(paramsError.message);
            
            // body参数验证
            const { error: bodyError, value: bodyValue } = changePasswordBodySchema.validate(req.body);
            if (bodyError) throw new BadRequestError(bodyError.message);
            const { oldPassword, newPassword } = bodyValue;
            await UserService.changePassword(paramsValue.id, oldPassword, newPassword);
            res.status(204).json({
                message: '密码已更新成功'
            })
        } catch (error: any) {
            res.status(error.status).json({
                message: error.message || '用户密码更新失败'
            })
        }
    }

    /**
     * 管理员重置用户密码（无需旧密码，通常重置为默认密码）
     * 请求方式：PATCH
     * 请求路径：/users/:id/reset-password（示例）
     * 路径参数：id（用户ID，直接转换为数字，可根据需求添加Joi校验）
     */
    static async resetPassword(req: Request, res: Response): Promise<void> { 
        try {
            console.log('重置密码用户ID: ',req.params)
            const id = parseInt(req.params.id);
            await UserService.resetPassword(id);
            res.status(204).json({
                message: '密码已重置成功'
            })
        } catch (error: any) {
            console.error('密码重置失败', error)
            res.status(error.status).json({
                message: error.message || '用户密码重置失败了'
            })
        }
    }

    /**
     * 获取用户统计数据（如总用户数、新增用户数、活跃用户数等）
     * 请求方式：GET
     * 请求路径：/users/stats（示例）
     * 适用场景：后台管理系统数据看板
     */
    static async getUserStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await UserService.getUserStats();
            res.status(200).json(stats);
        } catch (error: any) {
            res.status(error.status).json({
                message: error.message || '用户密码更新失败'
            })
        }
    }

    static async updateAvatar(req: Request, res: Response) {
        // 回滚函数
        let rollback: (() => Promise<void>) | null = null;
        try {
            // 验证参数
            const { error } = updateAvatarSchema.validate(req.params);
            if (error) throw new BadRequestError(error.message);

            // 提取shortId
            const { shortId } =  req.params;
            const userId = ShortIdUtil.decodeUserId(shortId)[0];

            // 获取文件
            const file = req.file;
            if (!file) throw new BadRequestError('请上传头像文件');

            // 上传到OSS，会自动压缩图片
            const uploadResult = await uploadToOSS(file, 'uploads/images/avatars');
            const { url, path, rollback: rollbackFn } = uploadResult;
            rollback = rollbackFn;

            // 更新用户头像
            const updateRes = await UserService.updateAvatar(userId, path);
            
            res.status(201).json({
                message: '头像更改成功',
                data: {
                    avatar: url,
                }
            })
        } catch (error: any) {
            console.log('[UserController.updateAvatar]: ', error.message);

            // 如果上传成功但是后续失效，自动回滚OSS文件
            if (rollback) await rollback();

            res.status(error.status || 500).json({
                message: error.message || '头像上传失败',
            })
        }
    }

    static async saveProfile(req: Request, res: Response) {
        try {
            console.log('req.body: ', req.body);
            console.log('req.params: ', req.params);
            // params参数验证
            const { error: paramsError } = saveProfileParamsSchema.validate(req.params);
            if (paramsError) throw new BadRequestError(paramsError.message);
            
            // body参数验证
            const { error: bodyError, value: bodyValue } = saveProfileBodySchema.validate(req.body);
            if (bodyError) throw new BadRequestError(bodyError.message);

            // 获取用户id
            const { shortId } = req.params;
            const userid = ShortIdUtil.decodeUserId(String(shortId.trim()))[0];

            await UserService.saveProfile(userid, bodyValue);

            res.status(201).json({
                message: '保存成功',
            })
        } catch (error: any) {
            console.log('updateProfile:', error.message);
            return res.status(error.stats || 400).json({
                message: error.message || '请求参数有误或格式错误',
            })
        }
    }

    static async resetAvatar(req: Request, res: Response) { 

    }

    static async updatePassword(req: Request, res: Response) {
        try {

        } catch (error) {
            
        }
    }

    static async deleteAccount(req: Request, res: Response) {
        
    }
}