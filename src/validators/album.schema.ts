import Joi from "joi";
import { idShema, pageSchema, limitSchema, sortSchema } from "./common.schema";



const nameSchema = Joi.string().min(2).max(128).messages({
    'string.base': '相册名称必须为字符串',
    'string.empty': '相册名称不能为空',
    'string.min': '相册名称长度不能小于2个字符',
    'string.max': '相册名称长度不能超过128个字符'
});

const slugSchema = Joi.string().min(2).max(128).messages({
    'string.base': '相册别名必须为字符串',
    'string.empty': '相册别名不能为空',
    'string.min': '相册别名长度不能小于2个字符',
    'string.max': '相册别名长度不能超过128个字符'
});

const titleSchema = Joi.string().min(2).max(128).messages({
    'string.base': '相册标题必须为字符串',
    'string.empty': '相册标题不能为空',
    'string.min': '相册标题长度不能小于2个字符',
    'string.max': '相册标题长度不能超过128个字符'
});

const descriptionSchema = Joi.string().min(2).max(1024).messages({
    'string.base': '相册描述必须为字符串',
    'string.empty': '相册描述不能为空',
    'string.min': '相册描述长度不能小于2个字符',
    'string.max': '相册描述长度不能超过1024个字符'
});

const coverPostIdSchema = Joi.number().integer().min(1).messages({
    'number.base': '封面图片ID必须为数字',
    'number.empty': '封面图片ID不能为空',
    'number.min': '封面图片ID不能小于1'
});

const coverPhotoUrlSchema = Joi.string().messages({
    'string.base': '封面图片URL必须为字符串',
    'string.empty': '封面图片URL不能为空',
});

const creatorSchema = Joi.string().min(2).max(128).default('SakiSDK').messages({
    'string.base': '创建者必须为字符串',
    'string.empty': '创建者不能为空',
    'string.min': '创建者长度不能小于2个字符',
    'string.max': '创建者长度不能超过128个字符'
});

const orderBySchema = Joi.string().valid('id', 'created_at', 'photo_count', 'updated_at').default('created_at').messages({
    'string.base': '排序字段必须为字符串',
    'string.empty': '排序字段不能为空',
    'any.only': '排序字段只能为id, created_at, photo_count, updated_at'
})

export const createAlbumSchema = Joi.object({
    name: nameSchema.required(),
    slug: slugSchema.allow(null, '').default(null),
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    cover_photo_id: coverPostIdSchema.allow(null, '').default(null),
    cover_photo_url: coverPhotoUrlSchema.allow(null, '').default(null),
    creator: creatorSchema
});

export const deleteAlbumSchema = Joi.object({
    id: idShema.required()
});

export const getWebAlbumDetailSchema = Joi.object({
    id: idShema.required(),
});

export const getWebAlbumListSchema = Joi.object({
    page: pageSchema,
    limit: limitSchema,
});

export const getAdminAlbumListSchema = Joi.object({
    id: idShema.allow(null, '').default(null),
    name: nameSchema.allow(null, '').default(null),
    slug: slugSchema.allow(null, '').default(null),
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    order_by: orderBySchema.allow(null, ''),
    page: pageSchema,
    limit: limitSchema,
    sort: sortSchema,
});

export const updateALbumParamsSchema = Joi.object({
    id: idShema.required(),
});

export const updateAlbumSchema = Joi.object({
    name: nameSchema,
    title: titleSchema,
    description: descriptionSchema.allow(null, '').default(null),
    cover_photo_id: coverPostIdSchema.allow(null, '').default(null),
    cover_photo_url: coverPhotoUrlSchema.allow(null, '').default(null),
})

export const setAlbumCoverParamsSchema = Joi.object({
    id: idShema.required(),
});

export const setAlbumCoverSchema = Joi.object({
    photo_id: coverPostIdSchema.required(),
    photo_url: coverPhotoUrlSchema.required(),
});