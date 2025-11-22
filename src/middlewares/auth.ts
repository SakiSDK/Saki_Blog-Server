import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt';
import { User } from '../models/User.model';

export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { 
    try {
        // 从请求头中提取令牌
        const token = JwtService.extractTokenFromHeader(req.headers.authorization);
        // 验证令牌
        const payload = JwtService.verifyAccessToken(token);
        // 查找用户
        const user = await User.findByPk(payload.id, {
            attributes: {exclude: ['password']}
        });
        if (!user) {
            res.status(401).json({ message: '用户不存在' })
            return;
        }
        if (user.status !== 'active') {
            res.status(401).json({ message: '用户未激活' })
        }
        req.user = user;
        next();
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
};


// 角色授权中间件
export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ error: '未认证' });
            return;
        }

        // 用户没有角色
        if (!req.user.role) {
            return res.status(403).json({
                error: '当前用户没有分配角色，禁止访问'
            })
        }

        if (!roles.includes(req.user.role as string)) {
            res.status(403).json({ error: '权限不足' });
            return;
        }
        next();
    };
};