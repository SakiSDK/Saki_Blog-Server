// src/middlewares/zodValidate.ts
import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

interface ValidateSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
  headers?: ZodSchema<any>;
}

/**
 * validate({ body, query, params, headers })
 * 每个字段都可选，值为 zod schema
 */
export const zodValidate = (schemas: ValidateSchemas = {}) => {
  const allowedKeys = ['body', 'query', 'params', 'headers'] as const;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = {} as any;

      for (const key of allowedKeys) {
        const schema = schemas[key];
        if (!schema) continue;

        // 使用 parseAsync 以支持 async refinements
        const parsed = await schema.parseAsync(req[key] ?? {});
        validated[key] = parsed;
      }

      // 将解析后的安全数据放到 req.validated（不覆盖 req.body 等原始数据）
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        // 格式化 Zod 错误项
        const issues = err.issues.map(issue => ({
          path: issue.path.length ? issue.path.join('.') : '(root)',
          message: issue.message,
          code: issue.code,
        }));

        return res.status(400).json({
          code: 400,
          success: false,
          message: 'Validation failed',
          detail: issues,
          data: null
        });
      }

      // 其他异常继续抛给上层错误处理中间件
      return next(err);
    }
  };
};