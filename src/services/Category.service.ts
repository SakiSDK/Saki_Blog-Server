import { BadRequestError, NotFoundError } from "../utils/errors";
import { Op, Transaction } from "sequelize";
import { sequelize, Category, PostCategory } from "../models/index";
import type { Pagination } from "../types/app";

/**
 * 分类创建输入数据接口，定义创建分类时所需的字段
 */
export interface CategoryCreateInput {
  name: string;        // 分类字段名称
  description?: string;// 描述
  order?: number;      // 分类字段排序优先级
  status?: 'active' | 'inactive';
}

/**
 * 分类服务类：处理分类相关的核心业务逻辑，包括创建、删除、查询、更新等操作
 *
 * 职责：封装业务规则、数据校验、事务管理，与数据模型交互完成业务流程
 */
export class CategoryService {
  /**
   * 获取所有活跃分类
   * @returns 包含所有活跃分类的数组
   */
  public static async getAllCategories(): Promise<Category[]> {
    return Category.findAll({
      attributes: ['id', 'name'],
      order: [['order', 'DESC']],
      where: {
        status: 'active'
      }
    });
  }
  /**
   * 创建分类
   * @param data - 分类创建输入数据（包含name、可选的description和order）
   * @returns 创建成功的分类实例
   * @description 验证分类名称非空，生成唯一slug，检查名称和slug是否已存在，最终创建分类记录
   */
  public static async createCategory(
    data: CategoryCreateInput
  ): Promise<Category> {
    if (!data.name) {
      throw new BadRequestError('分类名称不能为空');
    }
    const rawSlug = Category.generateSlug(data.name)
    if (!rawSlug) {
      throw new BadRequestError('无法生成有效的别名，请检查名称')
    }
    const existingCategory = await Category.findOne({
      where: {
        [Op.or]: [
          { name: data.name },
          { slug: rawSlug }
        ]
      }
    })
    if (existingCategory) {
      if (existingCategory.name === data.name.trim()) {
        throw new BadRequestError(`分类字段${data.name}已存在`);
      } else {
        throw new BadRequestError(`分类字段别名${rawSlug}已存在`);
      }
    }
    const category = await Category.create({
      name: data.name.trim() as string,
      description: data.description?.trim() || null,
      order: data.order || 0,
      slug: rawSlug,
      post_count: 0,
    });
    return category;
  }

  /**
   * 删除分类及关联关系
   * @param id - 要删除的分类ID
   * @returns 包含删除信息的对象（提示消息及关联关系删除数量）
   * @description 使用事务保证数据一致性，先检查分类是否存在，再删除关联的PostCategory记录，最后删除分类本身
   */
  public static async deleteCategory(id: number): Promise<{ message: string }> {
    const transaction: Transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      const category = await Category.findByPk(id, {
        transaction
      });
      if (!category) {
        throw new NotFoundError('分类不存在');
      }
      const categoryName = category.name;
      const postCategoryCount = await PostCategory.deleteByCategoryId(id, {
        transaction
      });
      await category.destroy();
      transaction.commit();
      return { message: `标签${categoryName}已经删除，删除了${postCategoryCount}条关联关系` };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  /**
   * 批量删除分类
   * @param categoryIds - 要删除的分类ID数组
   * @returns 删除的分类数量
   * @description 使用事务保证数据一致性，批量删除分类，并返回删除数量
   */
  public static async bulkDeleteCategory(categoryIds: number[]): Promise<{
    message: string;
    deletedCount: number;
  }> {
    const transaction: Transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      const deletedCount = await Category.destroy({
        where: {
          id: {
            [Op.in]: categoryIds
          }
        },
        transaction
      });
      // 业务校验（一个都没删）
      if (deletedCount === 0) {
        throw new Error('未找到可删除的分类');
      }
      await transaction.commit();
      return {
        message: `成功删除 ${deletedCount} 个分类`,
        deletedCount,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取分类列表（支持筛选、分页、排序）
   * @param query - 查询参数（包含筛选条件、分页信息、排序规则）
   * @returns 分类列表及分页信息（分类数组、总数、当前页、每页条数、总页数）
   * @description 处理默认参数，构建查询条件，通过分页和排序查询分类列表
   */
  public static async getCategoryList(query: any): Promise<{
    categories: Category[],
    pagination: Pagination
  }> {
    // 处理默认参数
    const {
      // 基础筛选条件
      id,
      name,
      keyword,
      // 时间参数
      createdFrom,
      createdTo,
      // 分页参数
      page = 1,
      pageSize = 10,
      // 排序参数
      orderBy = 'created_at',
      sort = 'desc',
    } = query;
    const offset: number = (page - 1) * pageSize;

    // 构建筛选条件
    const whereConditions: any = {};
    if (id) {
      whereConditions.id = Number(id);
    }
    if (name) {
      whereConditions.name = { [Op.like]: `%${name}%` };
    }
    if (keyword) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (createdFrom) {
      whereConditions.created_at = {
        [Op.gte]: new Date(createdFrom),
      };
    }
    if (createdTo) {
      whereConditions.created_at = {
        ...whereConditions.created_at,
        [Op.lte]: new Date(createdTo),
      };
    }

    // 执行分页查询
    const { rows, count } = await Category.findAndCountAll({
      order: [[orderBy, sort.toUpperCase()]],
      where: whereConditions,
      offset,
      limit: pageSize,
      raw: true,
    });

    // 返回分页结果
    return {
      categories: rows,
      pagination: {
        page: page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }
    };
  }

  /**
   * 更新分类信息
   * @param id - 要更新的分类ID
   * @param data - 包含更新字段的数据（name、description、order可选）
   * @returns 更新后的分类实例
   * @description 使用事务保证数据一致性，检查分类是否存在，若更新名称则重新生成并校验slug，最终执行更新
   */
  public static async updateCategory(id: number, data: CategoryCreateInput): Promise<Category> {
    const transaction: Transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      //* 先检查标签是否存在
      const category = await Category.findByPk(id, { transaction });
      if (!category) {
        throw new NotFoundError('标签不存在');
      }
      //* 如果更新名称，重新是重新生成slug并检验唯一性
      let newSlug = category.slug;
      if (data.name?.trim() && data.name.trim() !== category.name) {
        if (data.name.length > 50) {
          throw new BadRequestError('标签名称长度不能超过50个字符');
        }
        newSlug = Category.generateSlug(data.name);
        if (!newSlug) {
          throw new BadRequestError('无法生成有效的标签别名，请检查标签名称');
        }
      }
      const updateData: Record<string, any> = {};
      if (data.description) updateData.description = data.description.trim() || null;
      if (data.name) updateData.name = data.name.trim() || category.name;
      if (data.order) updateData.order = data.order;
      // 2.3 执行更新（只更新传入的非空参数）
      await category.update(updateData, { transaction });
      // 2.4 返回更新后的实例（重新查询确保数据最新）
      transaction.commit();
      return category;
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }

  /** 
   * 切换分类状态
   * @param id - 要切换状态的分类ID
   * @returns 更新后的分类实例
   * @description 使用事务保证数据一致性，检查分类是否存在，根据当前状态切换为相反状态（active->inactive或inactive->active）
   */
  public static async toggleCategoryStatus(id: number): Promise<Category> {
    const transaction: Transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      //* 先检查分类是否存在
      const category = await Category.findByPk(id, { transaction });
      if (!category) {
        throw new NotFoundError('分类不存在');
      }
      //* 切换状态（active->inactive或inactive->active）
      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      await category.update({ status: newStatus }, { transaction });
      // 2.4 返回更新后的实例（重新查询确保数据最新）
      transaction.commit();
      return category;
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }
}
