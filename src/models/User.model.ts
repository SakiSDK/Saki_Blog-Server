import { DataTypes, Model, Optional } from 'sequelize'
import bcrypt from 'bcryptjs'
import { sequelize } from './sequelize'
import { JwtService, JwtPayload } from '@/libs/jwt'
import {
  UnauthorizedError
} from '@/utils/error.util'
import { config } from '@/config/index';
import crypto from 'crypto'
import { createShortIdCodec } from '@/utils/shortId.codec'
import { Gender } from '@/schemas/user/user.share'


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
  id: number;       // 用户ID
  shortId: string;   // 短id，用于创建短链接
  githubId?: string;   // githubId
  googleId?: string;   // googleId
  qqId?: string;     // qqId
  username: string;   // 账号标识
  nickname: string;   // 用户昵称
  gender: 'male' | 'female' | 'other';
  avatar?: string;    // 用户头像
  password?: string;  // 密码
  email: string;    // 邮箱
  bio?: string;     // 用户简介
  status?: 'active' | 'inactive';
  role?: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  'id' | 'shortId' | 'username' | 'nickname'
  | 'status' | 'bio' | 'githubId' | 'avatar'
  | 'role' | 'gender' | 'createdAt' | 'updatedAt'
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
  public shortId!: string;
  public githubId?: string;
  public googleId?: string;
  public qqId?: string;
  public username!: string;
  public nickname!: string;
  public gender!: 'male' | 'female' | 'other';
  public bio?: string;
  public avatar?: string;
  public password?: string;
  public email!: string;  
  public role?: 'admin' | 'user';
  public status?: 'active' | 'inactive';
  public readonly createdAt!: Date;
  public updatedAt!: Date;

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
    let user = await User.findOne({ where: { googleId } });

    // 用户名，昵称
    const username = `google_${googleId.slice(-8)}`;
    const nickname = googleNickname || `用户_${generateRandomSuffix()}`;

    // 按email查找已有账号，自动绑定Google
    if (!user && email) {
      user = await User.findOne({
        where: { email }
      })
      if (user) {
        await user.update({
          googleId: googleId,
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
        googleId: googleId,
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
    // 生成shortId（统一在create后处理，或移到beforeCreate）
    if (!user.shortId) {
      const { encode } = createShortIdCodec(config.salt.user);
      const shortId = encode(user.id);
      await user.update({ shortId: shortId });
    }

    return this.generateTokens(user);
  }

  /** QQ登录专用 */
  public static async findOrCreateUserByQQId(params: {
    qqId: string,
    qqNickname: string,
    email: string,
    avatar: string,
    gender: Gender,
  }): Promise<{
    user: SafeUser;
    tokens: {
      accessToken: string;
      refreshToken: string
    }
  }> {
    const { qqId, qqNickname, email, avatar, gender } = params;
    let user = await User.findOne({ where: { qqId } });

    // 用户名，昵称
    const username = `qq_${qqId.slice(-8)}`;
    const nickname = qqNickname || `用户_${generateRandomSuffix()}`;

    // 按email查找已有账号，自动绑定QQ
    if (!user && email) {
      user = await User.findOne({
        where: { email }
      })
      if (user) {
        await user.update({
          qqId: qqId,
        })
        if (!user.avatar && avatar) await user.update({ avatar: avatar })
        if (!user.username || user.nickname === '用户') {
          await user.update({nickname: nickname})
        }
        return this.generateTokens(user); // 直接生成令牌返回
      }
    }

    // 无对应用户，创建新用户
    if (!user) {
      user = await User.create({
        qqId: qqId,
        email: email || `qq_${qqId}@your-domain.com`, // 邮箱可选
        username: username,
        nickname: nickname,
        gender: gender || 'other', // 默认性别
        status: 'active', // 自动激活
        role: 'user',
        avatar: avatar || undefined
      });
    }

    // 生成对应的shortId
    if (!user.shortId) {
      const { encode } = createShortIdCodec(config.salt.user);
      const shortId = encode(user.id);
      await user.update({ shortId: shortId });
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
        shortId: userInfo.shortId,
        nickname: userInfo.nickname,
        email: userInfo.email,
        gender: userInfo.gender,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        createdAt: userInfo.createdAt,
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
  shortId: {
    type: DataTypes.STRING(6),
    allowNull: true,
    comment: "用户短id",
    field: "short_id",
  },
  githubId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "用户github id",
    field: "github_id",
  },
  googleId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "用户google id",
    field: "google_id",
  },
  qqId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "用户qq id",
    field: "qq_id",
  },
  username: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: "用户名",
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
    comment: "用户性别",
  },
  bio: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '这个人很神秘，什么也没有写',
    comment: "用户个人介绍",
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "用户头像",
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [6, 100],
    },
    comment: "用户密码",
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true,
    },
    comment: "用户邮箱",
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: true,
    defaultValue: 'active',
    comment: "用户状态",
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: true,
    defaultValue: 'user',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,  
    comment: "创建时间",
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: "更新时间",
    field: 'updated_at',
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
      user.updatedAt = new Date()
    },
  },
})


