import Joi from "joi";
import {
    idShema, sortSchema, pageSchema, limitSchema
} from "./common.schema";

/** ---------- 通用字段 ---------- */
const albumIdShema = Joi.number().integer().min(1).messages({
    'number.base': '相册ID必须是数字',
    'number.integer': '相册ID必须是正整数',
    'number.min': '相册ID不能小于1',
})
const titleSchema = Joi.string().max(255).messages({
    'string.base': '标题必须是字符串',
    'string.max': '标题不能超过255个字符',
})
const descriptionSchema = Joi.string().max(255).messages({
    'string.base': '描述必须是字符串',
    'string.max': '描述不能超过255个字符',
})
const formatSchema = Joi.string().valid('jpg', 'png', 'gif', 'webp', 'svg', 'jpeg').messages({
    'string.base': '格式必须是字符串',
    'string.valid': '格式必须是jpg,png,gif,webp,svg,jpeg中的一种',
})
const uploaderSchema = Joi.string().max(50).messages({
    'string.base': '上传者必须是字符串',
    'string.max': '上传者不能超过50个字符',
})
const titlePrefixSchema = Joi.string().max(255).messages({
    'string.base': '标题前缀必须是字符串',
    'string.max': '标题前缀不能超过255个字符',
})
const orderBySchema = Joi.string().valid('created_at', 'updated_at', 'size', 'width', 'height').default('created_at').messages({
    'string.base': '排序字段必须是字符串',
    'string.valid': '排序字段必须是created_at,updated_at,size,width,height中的一个',
})


/** ---------- 上传图片校验 ---------- */
export const uploadPhotosSchema = Joi.object({
    album_id: albumIdShema.required(),
    uploader: uploaderSchema.default('SakiSDK'),
    description: descriptionSchema.allow(null, '').default(null),
    titlePrefix: titlePrefixSchema.allow(null, '').default(null),
})

export const getPhotoListSchema = Joi.object({
    album_id: albumIdShema.allow(null, '').default(null),
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    format: formatSchema.allow(null, '').default(null),
    page: pageSchema,
    limit: limitSchema,
    order_by: orderBySchema.allow(null, ''),
    sort: sortSchema,
})

export const updatePhotoParamsSchema = Joi.object({
    id: idShema,
})

export const updatePhotoSchema = Joi.object({
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    album_id: albumIdShema.allow(null, '').default(null),
})

export const deletePhotoSchema = Joi.object({
    id: idShema,
})

export const setCoverPhotoSchema = Joi.object({
    id: idShema,
})

export const getPhotosByAlbumIdSchema = Joi.object({
    album_id: albumIdShema.required(),
})