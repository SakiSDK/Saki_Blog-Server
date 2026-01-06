import { DataTypes, Model, Optional } from 'sequelize'
import bcrypt from 'bcryptjs'
import { sequelize } from './sequelize'
import { JwtService, JwtPayload } from '@/libs/jwt'
import {
    UnauthorizedError
} from '../utils/errors'
import { config } from '../config/index';
import crypto from 'crypto'
import { ShortIdUtil } from '../utils/shortId.util'


/** 安全用户信息（登录后返回） */
export type SafeUser = {
    id: number;
    shortId: string;
    nickname: string;
    email: string;
    gender: string;
    avatar: string | undefined;
    bio: string | undefined;
    createdAt: Date;
}

// 定义用户属性接口
interface UserAttributes {
    id: number;           // 用户ID
    short_id: string;     // 短id，用于创建短链接
    github_id?: string;   // github_id
    google_id?: string;   // google_id
    qq_id?: string;       // qq_id
    username: string;     // 账号标识
    nickname: string;     // 用户昵称
    gender: 'male' | 'female' | 'other';
    avatar?: string;      // 用户头像
    password?: string;    // 密码
    email: string;        // 邮箱
    bio?: string;         // 用户简介
    status?: 'active' | 'inactive';
    role?: 'admin' | 'user';
    created_at: Date;
    updated_at: Date;
}

interface UserCreationAttributes extends Optional<
    UserAttributes,
    'id' | 'short_id' | 'username' | 'nickname'
    | 'status' | 'bio' | 'github_id' | 'avatar'
    | 'role' | 'gender' | 'created_at' | 'updated_at'
> { }

const SERVER_URL: string = config.serverUrl as string;
const DEFAULT_AVATARS: {
    male: string[];
    female: string[];
    other: string[];
} = {
    male: [
        `${SERVER_URL}/avatars/avatar1.avif`,
        `${SERVER_URL}/avatars/avatar2.avif`,
        `${SERVER_URL}/avatars/avatar3.avif`,
    ],
    female: [
        `${SERVER_URL}/avatars/avatar4.avif`,
        `${SERVER_URL}/avatars/avatar5.avif`,
        `${SERVER_URL}/avatars/avatar6.avif`,
    ],
    other: [
        `${SERVER_URL}/avatars/avatar1.avif`,
        `${SERVER_URL}/avatars/avatar2.avif`,
        `${SERVER_URL}/avatars/avatar3.avif`,
        `${SERVER_URL}/avatars/avatar4.avif`,
        `${SERVER_URL}/avatars/avatar5.avif`,
        `${SERVER_URL}/avatars/avatar6.avif`,
    ]
}

// 生成安全随机整数（复用）
const getSecureRandomInt = (max: number): number => {
    const randomBuffer = crypto.randomBytes(4) // 生成 4 字节随机数
    const randomNumber = randomBuffer.readUInt32BE(0) / 0xffffffff
    return Math.floor(randomNumber * max)
}

// 生成6位随机数字（用于默认昵称）
const generateRandomSuffix = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// 生成去横杠的UUID（用于username，32位，唯一）
const generateUniqueUsername = (): string => {
    return crypto.randomUUID().replace(/-/g, '');
}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public short_id!: string;
    public github_id?: string;
    public google_id?: string;
    public qq_id?: string;
    public username!: string;
    public nickname!: string;
    public gender!: 'male' | 'female' | 'other';
    public bio?: string;
    public avatar?: string;
    public password?: string;
    public email!: string;  
    public role?: 'admin' | 'user';
    public status?: 'active' | 'inactive';
    public readonly created_at!: Date;
    public updated_at!: Date;

    // 密码验证（仅用于密码登录的用户，第三方用户登录无需调用）
    public async validatePassword(password: string): Promise<boolean> {
        if (!this.password) return false; // 🔴 无密码时直接返回false
        return bcrypt.compare(password, this.password);
    }

    // 密码登录专用，验证用户凭证(用于登录)
    static async validateCredentials(
        email: string,
        password: string
    ): Promise<{
        user: SafeUser;
        tokens: {
            accessToken: string;
            refreshToken: string
        }
    }> {
        const user = await User.findOne({ where: { email, status: 'active' } });
        if (!user) throw new UnauthorizedError('用户不存在或未激活');
        if (!user.password) throw new UnauthorizedError('该账号为第三方登录，无需密码，请直接通过对应平台登录');

        const isValid = await user.validatePassword(password);
        if (!isValid) {
            throw new UnauthorizedError('密码错误');
        }

        return this.generateTokens(user);
    }

    // Google登录专用，使用google_id查找或创建用户
    static async findOrCreateByGoogleId(params: {
        googleId: string;
        googleNickname?: string;
        email: string;
        avatar?: string;
    }): Promise<{
        user: SafeUser;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }> { 
        const { googleId, googleNickname, email, avatar } = params;
        let user = await User.findOne({ where: { google_id: googleId } });

        // 用户名，昵称
        const username = `google_${googleId.slice(-8)}`;
        const nickname = googleNickname || `用户_${generateRandomSuffix()}`;

        // 按email查找已有账号，自动绑定Google
        if (!user && email) {
            user = await User.findOne({
                where: { google_id: googleId }
            })
            if (user) {
                await user.update({
                    google_id: googleId,
                })
                if (!user.avatar && avatar) await user.update({ avatar: avatar })
                if (!user.username || user.nickname === '用户') {
                    await user.update({nickname: nickname})
                }
                return this.generateTokens(user); // 直接生成令牌返回
            }
        }

        // 无对应用户，创建新用户（自动生成username，处理nickname）
        if (!user) { 
            user = await User.create({
                google_id: googleId,
                email: email || `google_${googleId}@your-domain.com`, // 邮箱可选（Google可能不返回）
                username: username,
                nickname: nickname,
                gender: 'other', // 默认性别
                status: 'active', // 自动激活
                role: 'user',
                // 不传递password，字段为null
            });
            // 如果有google头像
            if (avatar) {
                await user.update({ avatar: avatar })
            }
        }

        // 生成对应的shortId，并保存userId
        // 生成short_id（统一在create后处理，或移到beforeCreate）
        if (!user.short_id) {
            const shortId = ShortIdUtil.encodeUserId(user.id);
            await user.update({ short_id: shortId });
        }

        return this.generateTokens(user);
    }

    // 工具方法：生成JWT令牌（复用逻辑）
    private static async generateTokens(user: User): Promise<{ user: SafeUser, tokens: { accessToken: string, refreshToken: string } }> {
        const jwtPayload: JwtPayload = {
            id: user.id,
            nickname: user.username,
            email: user.email,
            role: user.role as string,
        };
        const accessToken = JwtService.generateAccessToken(jwtPayload);
        const refreshToken = JwtService.generateRefreshToken(jwtPayload);
        const userInfo = await User.findByPk(user.id, { attributes: { exclude: ['password'] } }) as User;
        return {
            user: {
                id: userInfo.id,
                shortId: userInfo.short_id,
                nickname: userInfo.nickname,
                email: userInfo.email,
                gender: userInfo.gender,
                avatar: userInfo.avatar,
                bio: userInfo.bio,
                createdAt: userInfo.created_at,
            },
            tokens: { accessToken, refreshToken }
        };
    }
}

User.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    short_id: {
        type: DataTypes.STRING(6),
        allowNull: true,
        comment: "用户短id"
    },
    github_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    google_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    qq_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    username: {
        type: DataTypes.STRING(32),
        allowNull: true,
    },
    nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '用户',
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        defaultValue: 'other',
        allowNull: true,
    },
    bio: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: '这个人很神秘，什么也没有写',
    },
    avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            len: [6, 100],
        },
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: true,
        defaultValue: 'active',
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        allowNull: true,
        defaultValue: 'user',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, name: 'idx_users_github_id', fields: ['github_id'] },
        { unique: true, name: 'idx_users_google_id', fields: ['google_id'] },
        { unique: true, name: 'idx_users_qq_id', fields: ['qq_id'] },
        { unique: true, name: 'idx_users_email', fields: ['email'] },
        { unique: true, name: 'idx_users_username', fields: ['username'] },
        { name: 'idx_users_status', fields: ['status'] },
        { name: 'idx_users_role', fields: ['role'] }
    ],
    hooks: {
        beforeCreate: async (user: User) => {
            // 自动生成username（如果没有传递，比如第三方登录）
            if (!user.username) {
                user.username = generateUniqueUsername();
                // 极端情况：UUID重复（概率极低），重新生成
                const exists = await User.findOne({ where: { username: user.username } });
                if (exists) user.username = generateUniqueUsername();
            }
            // 自动生成nickname（如果没有传递）
            if (!user.nickname) {
                user.nickname = `用户_${generateRandomSuffix()}`;
            }
            // 创建用户之前执行，密码加密
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
            // 分配默认头像（无头像时）
            if (!user.avatar) {
                const index = getSecureRandomInt(DEFAULT_AVATARS[user.gender].length)
                user.avatar = DEFAULT_AVATARS[user.gender][index];
            }
        },
        beforeUpdate: async (user: User) => {
            // 更新用户之前执行，密码加密
            if (user.password&&user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
            // 更新时间
            user.updated_at = new Date()
        },
    },
})


