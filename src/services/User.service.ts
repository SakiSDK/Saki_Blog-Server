import { sequelize, User } from '@/models';
import { NotFoundError, BadRequestError } from '@/utils/error.util';
import { config } from '@/config'
import { resolveId } from '@/utils/id.util';
import { Transaction } from 'sequelize';
import { UserCreateData } from '@/schemas/user/user.admin';


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
    const userId = resolveId(rawId, config.salt.user);


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
  public static async getUserInfo(rawId: number | string): Promise<User> {
    const userId = resolveId(rawId, config.salt.user);

    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('用户不存在');
    return user;
  }

  /**
   * 获取用户基础信息
   * @param rawId - 用户ID(可以是短 ID 或者 普通 ID)
   * @returns 用户基础信息
   */
  public static async getUserBaseInfo(rawId: number | string): Promise<UserBaseInfo> {
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

  /** 
   * 新增用户
   * @param params - 用户参数
   * @returns 用户基础信息
   */
  public static async createUser(params: {
    nickname: string,
    avatar?: string,
    bio?: string,
    email: string,
    password: string,
  }, transaction?: Transaction): Promise<UserCreateData> {
    const { nickname, avatar, bio, email, password } = params;
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 检查用户名是否已存在
      const existUser = await User.findOne({
        where: {
          nickname
        },
      });
      if (existUser) throw new BadRequestError('用户名已存在');

      // 检查邮箱是否已经存在
      const existEmailUser = await User.findOne({
        where: {
          email
        },
      });
      if (existEmailUser) throw new BadRequestError('邮箱已存在');


      const user = await User.create({
        nickname,
        avatar,
        bio,
        email,
        password,
      }, { transaction: useTransaction });
      if (!transaction) {
        await useTransaction.commit();
      }
      return {
        id: user.id,
        shortId: user.shortId,
        nickname: user.nickname,
        avatar: user.avatar || null,
        bio: user.bio || null,
        email: user.email,
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }
}