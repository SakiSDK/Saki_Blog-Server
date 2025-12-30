// import { ShortIdUtil } from '../utils/shortIdUtil';
// import { sequelize, User } from '../models/index'
// import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors'
// import { Op, Transaction } from 'sequelize'
// import { config } from '../config/index';

// /**
//  * 用户列表查询参数接口
//  * 定义获取用户列表时支持的筛选、分页、排序参数
//  */
// export interface UserListQuery {
//     id?: number;
//     nickname?: string;
//     email?: string;
//     gender?: string;
//     role?: string;
//     status?: string;
//     page?: number;
//     limit?: number;
//     order_by: 'created_at' | 'updated_at' | 'id';
//     sort?: 'ASC' | 'DESC';
// }

// /**
//  * 用户服务层（Service层）
//  * --------------------
//  * 职责：封装用户相关核心业务逻辑，与数据访问层（User模型）交互
//  * 处理：数据校验、业务规则判断、事务管理、异常抛出，为控制器提供统一的业务接口
//  */
// export class UserService { 
//     /**
//      * 获取用户列表（支持多条件筛选、分页、排序）
//      * 核心规则：排除管理员账号（role != admin），不返回密码字段
//      * @param options - 查询参数（符合UserListQuery接口）
//      * @returns 包含用户列表、总数量、分页信息的对象
//      */
//     static async getUserList(options: UserListQuery): Promise<{
//         users: User[],
//         total: number,
//         page: number,
//         pageSize: number,
//         totalPages: number,
//     }> {
//         const { id, nickname, email, gender, role, status, page = 1, limit = 10, order_by = 'created_at', sort = 'DESC' } = options;
//         const offset = (page - 1) * limit;

//         const whereConditions: any = {};
//         if (id)  whereConditions.id = id;
//         if (nickname) whereConditions.nickname = { [Op.like]: `%${nickname}%` };
//         if (email)  whereConditions.email = { [Op.like]: `%${email}%` };
//         if (gender) whereConditions.gender = gender;
//         if (role) whereConditions.role = role;
//         if (status) whereConditions.status = status;

//         const { count, rows } = await User.findAndCountAll({
//             where: {
//                 ...whereConditions,
//                 role: {
//                     [Op.ne]: 'admin'
//                 }
//             },
//             attributes: { exclude: ['password'] },
//             order: [[order_by, sort]],
//             limit,
//             offset,
//         });
//         return {
//             users: rows,
//             total: count,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(count / limit),
//         };
//     }

//     /**
//      * 根据用户ID查询单个用户详情
//      * @param id - 用户唯一ID
//      * @returns 用户模型实例（不含密码）
//      * @throws NotFoundError - 用户不存在时抛出
//      */
//     static async getUserById(id: number): Promise<User> {
//         const user = await User.findByPk(id, {
//             attributes: { exclude: ['password'] }, //不返回密码
//         });
//         if (!user) {
//             throw new NotFoundError('用户不存在');
//         }
//         return user;
//     }

//     /**
//      * 创建新用户
//      * 核心规则：用户名/邮箱唯一，设置默认角色/状态/性别，密码由模型层自动加密
//      * @param data - 创建用户的原始数据（用户名、邮箱、密码为必填，其他可选）
//      * @returns 创建成功的用户模型实例
//      * @throws BadRequestError - 用户名/邮箱已存在时抛出
//      */
//     static async createUser(data: {
//         nickname: string;
//         email: string;
//         password: string;
//         gender?: 'male' | 'female' | 'other';
//         status?: 'active' | 'inactive';
//         role?: 'admin' | 'user';
//     }): Promise<User> { 
//         const transaction: Transaction = await sequelize.transaction();
//         try {
//             //检查用户是否已经存在
//             const existingUsername = await User.findOne({
//                 where: { nickname: data.nickname }
//             })
//             if (existingUsername) {
//                 throw new BadRequestError('用户名已存在')
//             }
//             //检查邮箱是否已经存在
//             const existingEmail = await User.findOne({
//                 where: { email: data.email }
//             })
//             if (existingEmail) {
//                 throw new BadRequestError('邮箱已存在')
//             }
//             const userData: any  = {
//                 nickname: data.nickname,
//                 email: data.email,
//                 password: data.password,
//                 role: data.role || 'user',
//                 status: data.status || 'active',
//                 gender: data.gender || 'other',
//             }
//             // 创建用户
//             const user = await User.create(userData)

//             // 生成短ID
//             const shortId = ShortIdUtil.encodeUserId(user.id)
//             const userWithShortId = await user.update({ short_id: shortId }, {
//                 transaction
//             })

//             // 提交事务
//             await transaction.commit()

//             return userWithShortId
//         } catch (error) {
//             transaction.rollback();
//             throw error;
//         }

//     }

//     /**
//      * 更新用户信息（支持部分字段更新，可选联动修改密码）
//      * 核心特性：事务保证原子性（更新+改密码要么同时成功，要么同时回滚），用户名/邮箱唯一校验
//      * @param id - 待更新用户的ID
//      * @param updates - 待更新的字段（支持用户名、邮箱、性别、角色、状态、密码相关）
//      * @returns 更新后的用户模型实例（不含密码）
//      * @throws NotFoundError - 用户不存在时抛出
//      * @throws BadRequestError - 用户名/邮箱已存在时抛出
//      */
//     static async updateUser(id: number, updates: {
//         nickname?: string,
//         email?: string,
//         gender?: 'male' | 'female' | 'other',
//         role?: 'admin' | 'user',
//         status?: 'active' | 'inactive'
//         old_password?: string,
//         new_password?: string,
//     }): Promise<User> { 
//         const transaction = await sequelize.transaction({
//             isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
//         })
//         try {
//             const user = await User.findByPk(id)
//             if (!user) {
//                 throw new NotFoundError('用户不存在')
//             }
//             //检查要修改的用户名是否与其他用户冲突
//             if (updates.nickname && updates.nickname !== user.nickname) {
//                 const existingUser = await User.findOne({ where: { nickname: updates.nickname } })
//                 if (existingUser) {
//                     throw new BadRequestError('用户名已存在')
//                 }
//             }
//             //检查邮箱是否与其他用户冲突
//             if (updates.email && updates.email !== user.email) {
//                 const existingUser = await User.findOne({ where: { email: updates.email } })
//                 if (existingUser) {
//                     throw new BadRequestError('邮箱已存在')
//                 }
//             }
//             //更新用户信息
//             if (updates.nickname != null) user.nickname = updates.nickname
//             if (updates.email != null) user.email = updates.email
//             if (updates.gender != null) user.gender = updates.gender
//             if (updates.role != null) user.role = updates.role
//             if (updates.status != null) user.status = updates.status
//             if (updates.old_password != null && updates.new_password != null) {
//                 console.log(updates)
//                 await this.changePassword(id, updates.old_password, updates.new_password, {
//                     transaction
//                 })
//             }
//             await user.save({ transaction });
//             return await User.findByPk(id, {
//                 attributes: { exclude: ['password'] },
//                 transaction,
//             }) as User;
//         } catch (error) {
//             transaction.rollback();
//             throw error;
//         }
//     }

//     /**
//      * 修改密码（支持独立调用或事务内调用）
//      * 核心规则：校验旧密码正确性，新密码由模型层自动加密
//      * @param id - 待修改密码的用户ID
//      * @param oldPassword - 旧密码（需验证）
//      * @param newPassword - 新密码（将被加密存储）
//      * @param options - 可选参数（支持传入事务）
//      * @throws NotFoundError - 用户不存在时抛出
//      * @throws BadRequestError - 旧密码错误时抛出
//      */
//     static async changePassword(
//         id: number,
//         oldPassword: string,
//         newPassword: string,
//         options?: {
//             transaction: Transaction
//         }
//     ): Promise<void> {
//         const user = await User.findByPk(id);
//         if (!user) throw new NotFoundError('用户不存在');
//         //验证当前密码
//         const isValidPassoword = await user.validatePassword(oldPassword);
//         console.log('isValidPassoword', isValidPassoword)
//         if (!isValidPassoword) throw new BadRequestError('当前密码错误');
//         user.password = newPassword; //存入密码会自动加密
//         await user.save();
//     }
    
//     /**
//      * 删除用户（物理删除，可根据需求改为逻辑删除）
//      * 核心规则：不能删除管理员账号，需校验用户存在
//      * @param id - 待删除用户的ID
//      * @returns 包含删除成功信息的对象
//      * @throws NotFoundError - 用户不存在时抛出
//      * @throws BadRequestError - 尝试删除管理员时抛出
//      */
//     static async deleteUser(id: number): Promise<{
//         message: string;
//     }> {
//         const user = await User.findByPk(id);
//         // 验证用户存不存在
//         if (!user) throw new NotFoundError('用户不存在');
//         // 管理员通过数据库删除
//         if (user.role === 'admin') throw new BadRequestError('不能删除管理员');
//         // 获取删除用户的用户名
//         const nickname = user.nickname;
//         await user.destroy();
//         return { message: `用户${nickname}删除成功` };
//     }

//     /**
//      * 管理员重置用户密码（无需旧密码）
//      * 核心规则：默认重置为123456，新密码自动加密，需校验用户存在
//      * @param id - 待重置密码的用户ID
//      * @param newPassword - 可选新密码（默认123456）
//      * @throws NotFoundError - 用户不存在时抛出
//      */
//     static async resetPassword(id: number, newPassword: string = '123456'): Promise<void> {
//         const user = await User.findByPk(id);
//         if (!user) throw new NotFoundError('用户不存在');
//         user.password = newPassword;
//         await user.save();
//     }

//     /**
//      * 获取用户统计数据（用于后台数据看板）
//      * 统计维度：总用户数、活跃/非活跃数、按性别分类、按角色分类
//      * @returns 结构化的统计结果对象
//      */
//     static async getUserStats(): Promise<{
//         total: number;
//         active: number;
//         inactive: number;
//         byGender: {
//             male: number;
//             female: number;
//             other: number;
//         };
//         byRole: {
//             admin: number;
//             user: number;
//         };
//     }>{
//         const total = await User.count();
//         const active = await User.count({ where: { status: 'active' } })
//         const inactive = await User.count({ where: { status: 'inactive' } })
//         const male = await User.count({ where: { gender: 'male' } })
//         const female = await User.count({ where: { gender: 'female' } })
//         const other = await User.count({ where: { gender: 'other' } })
//         const admin = await User.count({ where: { role: 'admin' } })
//         const user = await User.count({ where: { role: 'user' } })
//         return {
//             total,
//             active,
//             inactive,
//             byGender: {
//                 male,
//                 female,
//                 other
//             },
//             byRole: {
//                 admin,
//                 user
//             }
//         }
//     }


//     /** ---------- web端操作 ---------- */

//     /**
//      * 验证用户登录凭证（用于登录接口）
//      * 核心规则：校验用户存在、状态为未激活（注意：此处逻辑可能与业务预期相反，需确认）、密码正确
//      * @param email - 登录邮箱
//      * @param password - 登录密码
//      * @returns 验证通过的用户信息（不含密码）
//      * @throws UnauthorizedError - 用户不存在、状态异常、密码错误时抛出
//      */
//     static async validateCredentials(email: string, password: string): Promise<User>{
//         const user = await User.findOne({ where: { email } })
//         if (!user) throw new UnauthorizedError('用户不存在')
//         if (user.status !== 'inactive') throw new UnauthorizedError('用户未激活')
//         const isValidPassword = await user.validatePassword(password)
//         if (!isValidPassword) throw new UnauthorizedError('密码错误')
//         return await User.findByPk(user.id, {
//             attributes: { exclude: ['password'] }
//         }) as User;
//     }


//     static async updateAvatar(userId: number, avatarPath: string): Promise<void> {
//         // 拼接头像完整URL
//         await User.update({ avatar: avatarPath }, { where: { id: userId } });
//     }

//     static async saveProfile(userId: number, params: {
//         nickname: string,
//         bio?: string,
//     }) {
//         const { nickname, bio } = params;
//         const transaction = await sequelize.transaction();
//         try {
//             const user = await User.findByPk(userId);
//             if (!user) throw new NotFoundError('用户不存在');
//             if (nickname !== user.nickname) {
//                 const existUser = await User.findOne({
//                     where: {
//                         nickname
//                     }
//                 });
//                 if (existUser) throw new BadRequestError('用户名已存在');
//             }
//             const updateData: Partial<User> = { nickname };
//             if (bio !== undefined) updateData.bio = bio;
            
//             await user.update(updateData, { transaction });
//             await transaction.commit();

            
//         } catch (error) {
//             await transaction.rollback();
//             throw error;
//         }
//     }
// }

import { sequelize, User } from '@/models';
import { Op, Transaction } from 'sequelize'
import { NotFoundError, BadRequestError } from '@/utils/errors';
import { config } from '@/config'


export class UserService { 
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
   * @param userId - 用户ID
   * @returns 用户信息
   */
  public static async getUserInfo(userId: number): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('用户不存在');
    return user;
  }
}