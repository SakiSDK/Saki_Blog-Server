import Joi from "joi";

/** ---------- 通用字段 ---------- */
export const idShema = Joi.number().integer().min(1).messages({
    'number.base': 'ID必须是数字',
    'number.integer': 'ID必须是正整数',
    'number.min': 'ID不能小于1',
    'any.required': 'ID不能为空',
})

export const sortSchema = Joi.string().valid('ASC', 'DESC').default('DESC').messages({
    'string.base': '排序方式必须是字符串',
    'string.valid': '排序方式必须是ASC,DESC中的一个',
})

export const limitSchema = Joi.number().integer().min(1).default(10).messages({
    'number.base': 'limit必须是数字',
    'number.integer': 'limit必须是正整数',
    'number.min': 'limit不能小于1',
})

export const pageSchema = Joi.number().integer().min(1).default(1).messages({
    'number.base': 'page必须是数字',
    'number.integer': 'page必须是正整数',
    'number.min': 'page不能小于1',
})