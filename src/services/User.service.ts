import { sequelize, User } from '@/models';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import { config } from '@/config'
import { createShortIdCodec } from '@/utils/shortId.codec';


/** ---------- 类型定义 ---------- */
export interface UserBaseInfo {
  id: number;
  shortId: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
}

/** ---------- 辅助函数 ---------- */
/**  */


export class UserService { 
  /** 
   * 验证用户 ID 是否存在 
   * @param { number | string } rawId - 用户ID或者用户短ID
   * @returns { Promise<void> }
   * @throws { NotFoundError } - 如果用户不存在
   */
  public static async verifyUserId(rawId: number | string): Promise<number> {
    let userId: number;

    if (typeof rawId !== 'number') {
      const { decode } = createShortIdCodec(config.salt.user);
      // 将作者 ID 由短ID转为数字ID
      const decoded = decode(rawId);
      if (decoded === null) throw new BadRequestError('短ID无效');
      userId = decoded;
    } else {
      userId = rawId;
    }

    const user = await User.findOne({
      where: {
        id: userId
      }
    });
    
    if (!user) throw new NotFoundError('用户不存在');

    return userId;
  }

  /** 
   * 更新用户头像
   * @param userId - 用户ID
   * @param avatarPath - 头像路径
   */
  public static async updateUserAvatar(userId: number, avatarPath: string): Promise<void> {
    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('用户不存在');
    // 拼接头像完整URL
    await User.update({ avatar: avatarPath }, { where: { id: userId } });
  }

  /** 
   * 更新用户个人信息
   * @param userId - 用户ID
   * @param params - 更新参数
   */
  public static async updateUserProfile(userId: number, params: {
    nickname: string,
    bio?: string,
  }) {
    const { nickname, bio } = params;
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('用户不存在');
      if (nickname !== user.nickname) {
        const existUser = await User.findOne({
          where: {
            nickname
          }
        });
        if (existUser) throw new BadRequestError('用户名已存在');
      }
      const updateData: Partial<User> = { nickname };
      if (bio !== undefined) updateData.bio = bio;
      await user.update(updateData, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** 
   * 获取用户信息
   * @param rawId - 用户ID(可以是短 ID 或者 普通 ID)
   * @returns 用户信息
   */
  public static async getUserInfo(rawId: number): Promise<User> {
    let userId: number;

    if (typeof rawId !== 'number') {
      const { decode } = createShortIdCodec(config.salt.user);
      // 将作者 ID 由短ID转为数字ID
      const decoded = decode(rawId);
      if (decoded === null) throw new BadRequestError('短ID无效');
      userId = decoded;
    } else {
      userId = rawId;
    }


    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('用户不存在');
    return user;
  }

  /**
   * 获取用户基础信息
   * @param rawId - 用户ID(可以是短 ID 或者 普通 ID)
   * @returns 用户基础信息
   */
  public static async getUserBaseInfo(rawId: number): Promise<UserBaseInfo> {
    const userId = await this.verifyUserId(rawId);
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('用户不存在');
    return {
      id: user.id,
      shortId: user.shortId,
      nickname: user.nickname,
      avatar: user.avatar || null,
      bio: user.bio || null,
    }
  }
}