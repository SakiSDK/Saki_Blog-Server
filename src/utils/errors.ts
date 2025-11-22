// | 状态码 | 名称                    | 含义                            |
// | --- | --------------------- | -----------------------            |
// | 200 | OK                    | 请求成功，返回数据正常                |
// | 201 | Created               | 请求成功，服务器创建了新的资源         |
// | 400 | Bad Request           | 客户端请求错误，比如参数缺失、格式错误   |
// | 401 | Unauthorized          | 用户未认证（比如没有登录或 token 无效） |
// | 403 | Forbidden             | 用户已认证，但权限不足（没权访问资源）   |
// | 404 | Not Found             | 请求的资源不存在                     |
// | 500 | Internal Server Error | 服务器内部错误，非客户端问题           |


class AppError extends Error {
    constructor(message: string, public status: number, public details?: any) {
        super(message);
        this.name = this.constructor.name;
        this.status = status
        this.details = details
        Error.captureStackTrace?.(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(message = '资源未找到', details?: any) {
        super(message, 404, details);
    }
}

class ForbiddenError extends AppError {
    constructor(message = '用户权限不够', details?: any) {
        super(message, 403, details);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = '身份认证错误', details?: any) {
        super(message, 401, details);
    }
}

class BadRequestError extends AppError {
    constructor(message = '请求参数有误或格式错误', details?: any) {
        super(message, 400, details);
    }
}

class InternalServerError extends AppError {
    constructor(message = '服务器错误', details?: any) {
        super(message, 500, details);
    }
}

export {
    AppError,
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    BadRequestError,
    InternalServerError,
};
