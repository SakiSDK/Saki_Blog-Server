import Joi from "joi";
import { idShema, limitSchema, pageSchema, sortSchema } from "./common.schema";


const shortIdSchema = Joi.string().length(6).messages({
    'string.base': '短id必须是字符串',
    'string.length': '短id长度必须为6个字符',
});

const keywordSchema = Joi.string().max(255).messages({
    'string.base': '关键字必须是字符串',
    'string.max': '关键字长度不能超过255个字符',
});

const titleSchema = Joi.string().max(255).messages({
    'string.base': '标题必须是字符串',
    'string.max': '标题长度不能超过255个字符',
});

const descriptionSchema = Joi.string().max(255).messages({
    'string.base': '描述必须是字符串',
    'string.max': '描述长度不能超过255个字符',
});

const tagSchema = Joi.array().items(Joi.number()).messages({
    'string.base': '标签必须是字符串',
    'string.max': '标签长度不能超过255个字符',
});

const categorySchema = Joi.array().items(Joi.number()).messages({
    'array.base': '标签ID数组必须是数组',
    'array.items': '标签ID数组的元素必须是数字'
})

const statusSchema = Joi.string().messages({
    'string.base': '状态必须是字符串',
    'string.valid': '状态只能为draft或published'
});

const orderBySchema = Joi.string().valid('created_at', 'updated_at', 'id').messages({
    'string.base': '排序字段必须是字符串',
    'string.valid': '排序字段只能为created_at或updated_at'
});

const imageUrlsSchema = Joi.array().items(Joi.string()).messages({
    'array.base': '图片数组必须是数组',
    'array.items': '图片数组的元素必须是字符串'
})

const contentSchema = Joi.string().messages({
    'string.base': '内容必须是字符串',
});



export const getRecentPostsSchema = Joi.object({
    limit: limitSchema.default(5),
});

export const getPostDetailSchema = Joi.object({
    shortId: shortIdSchema,
});

export const searchPostListSchema = Joi.object({
    limit: limitSchema.default(5),
    page: pageSchema.default(1),
    keyword: keywordSchema.allow(null, '').default(null),
})

export const getWebPostListSchema = Joi.object({
    limit: limitSchema,
    page: pageSchema,
});

export const getAdminPostListSchema = Joi.object({
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    tags: tagSchema.default([]),
    categories: categorySchema.default([]),
    limit: limitSchema,
    page: pageSchema,
    status: statusSchema.valid('published', 'draft').default('published'),
    sort: sortSchema,
    order_by: orderBySchema.default('created_at'),
})

export const uploadDraftArticleSchema = Joi.object({
    title: titleSchema.allow(null, '').default(null),
    description: descriptionSchema.allow(null, '').default(null),
    status: statusSchema.valid('draft'),
    categories: categorySchema.default([]),
    tags: tagSchema.default([]),
    image_urls: imageUrlsSchema.default([]),
    content: contentSchema.allow(null, '').default(null),
})

export const uploadCompleteArticleSchema = Joi.object({
    title: titleSchema.required(),
    description: descriptionSchema.required(),
    status: statusSchema.valid('published').required(),
    categories: categorySchema.required(),
    tags: tagSchema.required(),
    image_urls: imageUrlsSchema.allow(null, '').default([]),
    content: contentSchema.required(),
})

export const deletePostWithAssociationsSchema = Joi.object({
    id: idShema.required(),
})

