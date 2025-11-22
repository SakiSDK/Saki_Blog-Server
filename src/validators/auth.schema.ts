import Joi from "joi";

const nicknameSchema = Joi.string().min(2).max(50).messages({
    'string.base': '用户名必须为字符串',
    'string.empty': '用户名不能为空',
    'string.min': '用户名长度不能小于2个字符',
    'string.max': '用户名长度不能超过50个字符',
})

const emailSchema = Joi.string().max(100).email().messages({
    'string.base': '邮箱必须为字符串',
    'string.empty': '邮箱不能为空',
    'string.email': '邮箱格式不正确',
    'string.max': '邮箱长度不能超过100个字符',
})

const passwordSchema = Joi.string().min(6).max(100).messages({
    'string.base': '密码必须为字符串',
    'string.empty': '密码不能为空',
    'string.min': '密码长度不得少于6个字符',
    'string.max': '密码长度不能超过100个字符',
})

const timestampSchema = Joi.number().integer().messages({
    'number.base': '时间戳必须为数字',
    'number.integer': '时间戳必须为整数',
})

const nonceSchema = Joi.string().max(100).messages({
    'string.base': '随机数必须为字符串',
    'string.empty': '随机数不能为空',
    'string.max': '随机数长度不能超过100个字符',
})

const signatureSchema = Joi.string().max(100).messages({
    'string.base': '签名必须为字符串',
    'string.empty': '签名不能为空',
    'string.max': '签名长度不能超过100个字符',
})

const clientSchema = Joi.string().valid('web', 'admin').messages({
    'string.base': '客户端类型必须为字符串',
    'string.empty': '客户端类型不能为空',
    'any.only': '客户端类型只能为web或admin',
})


export const authLoginSchema = Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    timestamp: timestampSchema.required(),
    nonce: nonceSchema.required(),
    signature: signatureSchema.required(),
    captcha_key: Joi.string().messages({
        'string.base': '验证码 key 必须为字符串',
    }),
    captcha: Joi.string().messages({
        'string.base': '验证码必须为字符串',
    }),
    client: clientSchema.required(),
})

export const authWebLoginSchema = Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    timestamp: timestampSchema.required(),
    nonce: nonceSchema.required(),
    signature: signatureSchema.required(),
    captcha_key: Joi.string().messages({
        'string.base': '验证码 key 必须为字符串',
    }),
    captcha: Joi.string().messages({
        'string.base': '验证码必须为字符串',
    })
})

export const authRegisterSchema = Joi.object({
    nickname: nicknameSchema.required(),
    email: emailSchema.required(),
    verifyCode: Joi.string().length(6).required().messages({
        'string.base': '验证码必须为字符串',
        'string.empty': '验证码不能为空',
        'string.length': '验证码必须是6位字符',
    }),
    password: passwordSchema.required(),
})

export const sendVerifyCodeSchema = Joi.object({
    email: emailSchema.required(),
})