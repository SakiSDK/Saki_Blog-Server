import Joi from "joi";
import { idShema, limitSchema, pageSchema, sortSchema,  } from "./common.schema";

const nameSchema = Joi.string().min(1).max(50).messages({
    'string.base': '标签名称必须为字符串',
    'string.empty': '标签名称不能为空',
    'string.min': '标签名称长度不能小于1个字符',
    'string.max': '标签名称长度不能超过50个字符',
});

const descriptionSchema = Joi.string().max(255).messages({
    'string.base': '标签描述必须为字符串',
    'string.empty': '标签描述不能为空',
});

const orderSchema = Joi.number().integer().min(1).max(100).messages({
    'number.base': '排序必须为数字',
    'number.empty': '排序不能为空',
    'number.min': '排序不能小于1',
    'number.max': '排序不能大于100',
});

const slugSchema = Joi.string().max(50).messages({
    'string.base': '标签slug必须为字符串',
    'string.empty': '标签slug不能为空',
    'string.max': '标签slug长度不能超过50个字符',
});

const orderBy = Joi.string().valid('created_at', 'updated_at', 'order', 'post_count').messages({
    'string.base': '排序字段必须为字符串',
    'string.empty': '排序字段不能为空',
    'any.only': '排序字段只能为created_at、updated_at、order、post_count'
})

export const createTagSchema = Joi.object({
    name: nameSchema.required(),
    description: descriptionSchema.allow(null, '').allow(null),
    order: orderSchema.required(),
});

export const deleteTagSchema = Joi.object({
    id: idShema.required(),
});

export const getWebTagListSchema = Joi.object({
    page: pageSchema,
    limit: limitSchema,
})

export const getAdminTagListSchema = Joi.object({
    id: idShema.allow(null, '').default(null),
    name: nameSchema.allow(null, '').allow(null),
    description: descriptionSchema.allow(null, '').allow(null),
    order: orderSchema.allow(null, '').allow(null),
    slug: slugSchema.allow(null, '').allow(null),
    page: pageSchema,
    limit: limitSchema,
    order_by: orderBy.default('created_at'),
    sort: sortSchema.default('DESC'),
})

export const updateTagParamsSchema = Joi.object({
    id: idShema.required(),
})

export const updateTagSchema = Joi.object({
    name: nameSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    order: orderSchema.allow(null, '').default(null),
});

