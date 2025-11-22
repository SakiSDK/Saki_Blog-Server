import Joi from "joi";
import { sortSchema, idShema, pageSchema, limitSchema } from "./common.schema";

const nicknameSchema = Joi.string().max(50).min(2).messages({
    'string.max': '用户名长度不能大于50个字符',
    'string.min': '用户名长度不能小于2个字符',
})

const emailSchema = Joi.string().email().max(100).messages({
    'string.email': '邮箱格式不正确',
    'string.max': '邮箱长度不能大于100个字符',
})

const passwordSchema = Joi.string().min(6).max(100).messages({
    'string.min': '密码长度不得少于6个字符',
    'string.max': '密码长度不能大于100个字符',
})

const roleSchema = Joi.string().valid('admin', 'user').messages({
    'string.valid': '角色只能为admin或user',
})

const statusSchema = Joi.string().valid('active', 'inactive').messages({
    'string.valid': '状态只能为active或inactive',
})

const orderBySchema = Joi.string().valid('created_at', 'updated_at', 'id').messages({
    'string.valid': '排序字段只能为created_at、updated_at或id',
})

const genderSchema = Joi.string().valid('male', 'female', 'other').messages({
    'string.valid': '性别只能为male、female或other',
})

const shortIdSchema = Joi.string().length(6).required().messages({
    'string.length': 'shortId长度必须为8位',
    'string.required': 'shortId不能为空',
    'string.base': 'shortId必须为字符串',
})


export const getUserListSchema = Joi.object({
    id: idShema.allow(null, '').default(null),
    gender: genderSchema.allow(null, '').default(null),
    nickname: nicknameSchema.allow(null, '').default(null),
    email: emailSchema.allow(null, '').default(null),
    role: roleSchema.allow(null, '').default(null),
    status: statusSchema.allow(null, '').default(null),
    page: pageSchema.default(1),
    limit: limitSchema.default(10),
    order_by: orderBySchema.default('created_at'),
    sort: sortSchema.default('DESC'),
})


export const getUserByIdSchema = Joi.object({
    id: idShema.required(),
})

export const createUserSchema = Joi.object({
    nickname: nicknameSchema.required(),
    email: emailSchema.required(),
    password: passwordSchema.default('123456').required(),
    gender: genderSchema.default('other'),
    status: statusSchema.default('active'),
    role: roleSchema.default('user'),
})

export const updateUserParamsSchema = Joi.object({
    id: idShema.required(),
})
export const updateUserBodySchema = Joi.object({
    nickname: nicknameSchema.required().default(null),
    email: emailSchema.required().default(null),
    old_password: passwordSchema.allow(null, '').default(null),
    new_password: passwordSchema.allow(null, '').default(null),
    gender: genderSchema.default('other'),
    status: statusSchema.default('active'),
    role: roleSchema.default('user'),
})

export const deleteUserSchema = Joi.object({
    id: idShema.required(),
})

export const changePasswordParamsSchema = Joi.object({
    id: idShema.required(),
})

export const changePasswordBodySchema = Joi.object({
    old_password: passwordSchema.required(),
    new_password: passwordSchema.required(),
})

export const saveProfileParamsSchema = Joi.object({
    shortId: shortIdSchema,
})

export const saveProfileBodySchema = Joi.object({
    nickname: nicknameSchema.required(),
    bio: Joi.string().max(100).allow(null, '').default(null).messages({
        'string.base': '简介必须为字符串',
        'string.max': '简介长度不能超过100个字符',
    }),
    //? 还有个网站暂时先不搞
})

export const updateAvatarSchema = Joi.object({
    shortId: shortIdSchema,
})