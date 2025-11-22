import Joi from "joi";
import { idShema, pageSchema, sortSchema } from "./common.schema";


const nameSchme = Joi.string().min(2).max(128).messages({
    'string.base': '分类字段名称必须为字符串',
    'string.empty': '分类字段名称不能为空',
    'string.min': '分类字段名称长度不能小于2个字符',
    'string.max': '分类字段名称长度不能超过128个字符',
    'any.required': '分类字段名称不能为空'
})

const descriptionSchme = Joi.string().max(255).messages({
    'string.base': '分类字段描述必须为字符串',
    'string.max': '分类字段描述长度不能超过255个字符'
})

const orderSchema = Joi.number().integer().min(0).max(100).messages({
    'number.base': '分类字段排序必须为数字',
    'number.empty': '分类字段排序不能为空',
    'number.min': '分类字段排序不能小于1',
    'any.required': '分类字段排序不能为空'
})

const slugSchema = Joi.string().max(128).messages({
    'string.base': '分类字段slug必须为字符串',
    'string.max': '分类字段slug长度不能超过128个字符'
})

const orderBySchema = Joi.string().valid('created_at', 'post_count' ,'updated_at', 'order').messages({
    'string.base': '分类字段排序字段必须为字符串',
    'string.empty': '分类字段排序字段不能为空',
    'any.only': '分类字段排序字段只能为created_at、post_count、updated_at、order'
})


export const createCategorySchmea = Joi.object({
    name: nameSchme.required(),
    description: descriptionSchme.allow(null, '').default(null),
    order: orderSchema.required(),
})

export const deleteCategorySchmea = Joi.object({
    id: idShema.required(),
})

export const getWebCategoryListSchema = Joi.object({
    page: pageSchema.default(1),
    limit: pageSchema.default(10),
})

export const getAdminCategoryListSchema = Joi.object({
    id: idShema.allow(null, '').default(null),
    name: nameSchme.allow(null, '').default(null),
    description: descriptionSchme.allow(null, '').default(null),
    order: orderSchema.allow(null, '').default(null),
    slug: slugSchema.allow(null, '').default(null),
    page: pageSchema.default(1),
    limit: pageSchema.default(10),
    sort: sortSchema.default('DESC'),
    order_by: orderBySchema.default('created_at'),
})

export const updateCategoryParamsSchema = Joi.object({
    id: idShema.required(),
})

export const updateCategorySchmea = Joi.object({
    name: nameSchme.allow(null, '').default(null),
    description: descriptionSchme.allow(null, '').default(null),
    order: orderSchema.allow(null, '').default(null),
})