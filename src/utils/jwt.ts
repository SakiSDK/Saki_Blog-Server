import jwt from 'jsonwebtoken'
import { config } from '../config/index'
import { logger } from '../utils/logger'
import { AppError } from './errors';

// JWT负载结构（仅包含用户核心标识数据，避免敏感数据被 exposure）
export interface JwtPayload {
    id: number;         // 用户ID
    username: string;   // 用户名
    email: string;      // 邮箱
    role: string;       // 角色
}

// 从配置文件中获取JWT参数（集中管理，便于环境切换）
const ACCESSTOKENSECRET = config.jwt.accessTokenSecret
const REFRESHTOKENSECRET = config.jwt.refreshTokenSecret
const ACCESSEXPIRESIN: string | number = config.jwt.accessExpiresIn
const REFRESHEXPIRESIN: string | number = config.jwt.refreshExpiresIn


export class JwtService {
    // 生成访问令牌（短期有效，用于接口访问），JWT本身就存储了id.username.email.role这些字段
    static generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(
            payload,
            ACCESSTOKENSECRET,
            { expiresIn: ACCESSEXPIRESIN  } as jwt.SignOptions,
        )
    }

    // 生成刷新令牌（长期有效，用于刷新访问令牌）
    static generateRefreshToken(payload: JwtPayload): string {
        return jwt.sign(
            { ...payload, tokenType: 'refresh' },
            REFRESHTOKENSECRET,
            {
                expiresIn: REFRESHEXPIRESIN,

            } as jwt.SignOptions,
        )
    }

    // 验证访问令牌合法性
    static verifyAccessToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, ACCESSTOKENSECRET) as JwtPayload;
        } catch (error) {
            logger.error('JWT 验证失败', error)
            throw new AppError('无效或过期的访问令牌', 401);
        }
    }

    // 验证刷新令牌合法性
    static verifyRefreshToken(token: string): JwtPayload {
        try {
            const payload = jwt.verify(token, REFRESHTOKENSECRET) as JwtPayload & { tokenType: string };
            if (payload.tokenType !== 'refresh') throw new AppError('无效的刷新令牌', 401);
            return payload;
        } catch (error) {
            logger.error('JWT 验证失败', error)
            throw new AppError('无效或过时的刷新令牌', 401);
        }
    }

    // 从请求中获取访问令牌（Bearer格式）
    static extractTokenFromHeader(authHeader: string | undefined): string {
        if (!authHeader) {
            throw new Error('授权头不存在');
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new Error('令牌格式错误');
        }
        return parts[1];
    }
}