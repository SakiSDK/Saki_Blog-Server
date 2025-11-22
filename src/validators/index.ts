import Joi, { ObjectSchema, ValidationOptions } from 'joi';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { BadRequestError } from '../utils/errors';


/** ---------- 类型定义 ---------- */
// 定义合法来源类型
type ValidSource = 'params' | 'query' | 'body';
// 支持：单个来源字符串 + 多个来源数组
type Source = ValidSource | ValidSource[];


/** ---------- 常量定义 ---------- */
const LEGAL_SOURCES: ValidSource[] = ['params', 'query', 'body'];
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
    abortEarly: false,
    allowUnknown: true,
};



/** ---------- 参数校验 ---------- */
/**
 * 参数校验中间件（数组版，更直观）
 * @param schema Joi校验规则
 * @param source 校验数据源（单个字符串或数组，如 'body' 或 ['params', 'query', 'body']）
 * @param customOptions 自定义Joi校验选项
 * @returns Express中间件
 */
export const validate = (
    schema: ObjectSchema,
    source: Source = 'body',
    customOptions: ValidationOptions = {}
): RequestHandler => {
    // 统一转化为数组（兼容单个字符串和数组传参）
    const parsedSources: ValidSource[] = Array.isArray(source) ? source : [source];

    // 校验合法来源（容错+明确报错）
    const invalidSources = parsedSources.filter(s => !LEGAL_SOURCES.includes(s))
    if (invalidSources.length > 0) {
        throw new BadRequestError(
            `无效的数据源：${invalidSources.join(', ')}，
            合法值为：${LEGAL_SOURCES.join(', ')}，
            支持单个字符串或数组传参`
        )
    }

    // 合并校验选项
    const validationOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...customOptions };

    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // 安全合并数据源（处理 req.body/query/params 可能为 undefined/null/非对象 的情况）
            const data: Record<string, any> = {};
            parsedSources.forEach(src => {
                const sourceData = req[src];
                if (sourceData && typeof sourceData === 'object' && !Array.isArray(sourceData)) {
                    Object.assign(data, sourceData);
                }
            })

            // 执行校验
            const { error, value } = schema.validate(data, validationOptions);
            if (error) {
                return res.status(400).json({
                    code: 400,
                    message: '请求参数有误或格式错误',
                    errors: error.details.map(d => ({
                        field: d.path.join('.'), // 补充字段名，方便前端定位
                        message: d.message, // 去除默认的引号
                        type: d.type // 错误类型（方便调试）
                    }))
                })
            }

            // 写回校验后的值（含默认值），避免跨来源污染
            parsedSources.forEach(src => {
                const target = req[src];
                if (!target) return;

                Object.entries(value).forEach(([key, val]) => {
                    // 只写入当前数据源的字段或Schema中定义的字段
                    if (Object.prototype.hasOwnProperty.call(target, key) || schema.extract(key)) {
                        req[src][key] = val;
                    }
                })
                
                next();
            })
        } catch (err) {
            return res.status(500).json({
                code: 500,
                message: '参数校验中间件异常',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}