import { PostTag } from '../models/PostTag.model';
import { sequelize } from '../models/index';
import { Tag } from '../models/Tag.model'
import { BadRequestError, NotFoundError } from '../utils/errors'
import { Op, Transaction } from 'sequelize'
import type { Pagination } from '../types/app';
import { HotTagResult } from '../types/models/tag.type';
import { HotTagParams } from '../schemas/web/tag.schema';
import { TagCreateBody, TagListQuery } from '../schemas/admin/tag.schema';

export class TagService {
  /**
   * 创建标签（自动生成slug，确保name/slug唯一）
   * @param data      标签创建数据
   * @returns         新创建的标签实例
   */
  public static async createTag(data: TagCreateBody): Promise<Tag> {
    //* 基础参数校验
    if (!data.name?.trim()) {
      throw new BadRequestError('标签名称不能为空');
    }
    if (data.name.length > 50) {
      throw new BadRequestError('标签名称长度不能超过50个字符');
    }
    //* 生成唯一slug
    const rawSlug = Tag.generateSlug(data.name);
    if (!rawSlug) {
      throw new BadRequestError('无法生成有效的标签别名，请检查名称');
    }
    const existingTag = await Tag.findOne({
      where: {
        [Op.or]: [
          { name: data.name },
          { slug: rawSlug }
        ]
      }
    });
    if (existingTag) {
      if (existingTag.name === data.name.trim()) {
        throw new BadRequestError(`标签“${data.name}”已存在`);
      } else {
        throw new BadRequestError(`标签别名“${rawSlug}”已被占用，请修改标签名称`);
      }
    }
    const tag = await Tag.create({
      name: data.name.trim(),
      slug: rawSlug,
      description: data.description?.trim() || null,
      order: data.order ? Number(data.order) : 0,
      post_count: 0, // 初始无关联文章，计数为0
    });
    return tag;
  }

  /**
   * 更新标签
   * @param id 标签ID
   * @param data 
   */
  public static async updateTag(id: number, data: TagCreateBody): Promise<Tag> {
    const transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      //* 先检查标签是否存在
      const tag = await Tag.findByPk(id, { transaction });
      if (!tag) {
        throw new NotFoundError('标签不存在');
      }
      //* 如果更新名称，重新是重新生成slug并检验唯一性
      let newSlug = tag.slug;
      if (data.name?.trim() && data.name.trim() !== tag.name) {
        if (data.name.length > 50) {
          throw new BadRequestError('标签名称长度不能超过50个字符');
        }
        newSlug = Tag.generateSlug(data.name);
        if (!newSlug) {
          throw new BadRequestError('无法生成有效的标签别名，请检查标签名称');
        }
      }
      const updateData: Record<string, any> = {}
      if (data.name) {
        updateData.name = data.name.trim();
      }
      if (newSlug) {
        updateData.slug = newSlug;
      }
      if (data.description) {
        updateData.description = data.description.trim();
      }
      if (data.order) {
        updateData.order = data.order;
      }
      // 2.3 执行更新（只更新传入的非空参数）
      await tag.update(updateData, {
        transaction
      });
      // 提交事务
      await transaction.commit();
      // 2.4 返回更新后的实例（重新查询确保数据最新）
      return tag as Tag;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 删除标签(及其关联关系表，避免外键冲突)
   * @param id 标签ID
   * @returns 删除成功提示
   */
  public static async deleteTag(id: number): Promise<{ message: string }> {
    // 开启事务： 确保标签删除和关联关系删除原子性
    const transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      // 检查标签是否存在
      const tag = await Tag.findByPk(id, { transaction });
      if (!tag) {
        throw new NotFoundError('标签不存在');
      }
      const tagName = tag.name;
      // 先删除中间表(PostTag)的关联记录
      const postTagCount: number = await PostTag.deleteByTagId(id, {
        transaction
      });
      // 再删除标签本身
      await tag.destroy({ transaction });
      // 提交事务
      await transaction.commit();
      return { message: `标签(${tagName})已删除, 删除了${postTagCount}条关联关系` };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取标签列表
   * @param query 查询参数
   * @returns 标签列表+总条数
   */
  public static async getTagList(query: TagListQuery): Promise<{
    tags: Tag[],
    pagination: Pagination,
  }> {
    // 处理默认参数
    const {
      page = 1,
      pageSize = 10,
      keyword,
      // 时间参数
      createdFrom,
      createdTo,
      createdRange,
      // 排序参数
      orderBy = 'created_at',
      sort = 'DESC'
    } = query;
    const offset = (page - 1) * pageSize;
    
    // 构建筛选条件
    const whereConditions: any = {};
    /** ---------- keyword 搜索 ---------- */
    if (keyword?.trim()) {
      const kw = keyword.trim();
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${kw}%` } },
        { description: { [Op.like]: `%${kw}%` } }
      ];
    }
    /** ---------- 时间参数 ---------- */
    if (createdFrom || createdTo || Array.isArray(createdRange)) {
      whereConditions.created_at = {};

      // >= 某时间
      if (createdFrom) {
        whereConditions.created_at[Op.gte] = new Date(createdFrom);
      }

      // <= 某时间
      if (createdTo) {
        whereConditions.created_at[Op.lte] = new Date(createdTo);
      }

      // between
      if (Array.isArray(createdRange) && createdRange.length === 2) {
        whereConditions.created_at[Op.between] = [
          new Date(createdRange[0]),
          new Date(createdRange[1]),
        ];
      }
    }
    // 执行分页查询
    const { count, rows } = await Tag.findAndCountAll({
      where: whereConditions,
      order: [[orderBy, sort]],
      offset,
      limit: pageSize,
      raw: true
    });

    // 返回分页结果
    return {
      tags: rows,
      pagination: {
        page: page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }
    };
  }

  /**
   * 获取热门标签，根据文章数量
   */
  public static async getHotTags(query: HotTagParams): Promise<HotTagResult> {
    const { pageSize = 10, withPostCount = true } = query;
    const attributes = ['id', 'name', 'slug', 'description', 'order', 'created_at'];
    if (withPostCount) {
      attributes.push('post_count');
    }
    const tags = await Tag.findAndCountAll({
      attributes,
      limit: pageSize,
      order: [['post_count', 'DESC']],
      distinct: true,
      raw: true,
    })
    return {
      tags: tags.rows,
    };
  }

  /** 
   * 切换标签状态
   */
  public static async toggleTagStatus(tagId: number): Promise<Tag> {
    const tag = await Tag.findByPk(tagId);
    if (!tag) {
      throw new NotFoundError('标签不存在');
    }
    tag.status = tag.status === 'active' ? 'inactive' : 'active';
    await tag.save();
    return tag;
  }

  /**
   * 批量删除标签
   */
  public static async bulkDeleteTag(
    tagIds: number[]
  ): Promise<{
    message: string;
    deletedCount: number
  }> {
    const transaction = await sequelize?.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
      // 删除标签
      const deletedCount = await Tag.destroy({
        where: {
          id: tagIds
        },
        transaction
      });
      // 业务校验（一个都没删）
      if (deletedCount === 0) {
        throw new Error('未找到可删除的标签');
      }
      // 提交事务
      await transaction.commit();
      // 返回业务结果
      return {
        message: `成功删除 ${deletedCount} 个标签`,
        deletedCount,
      };
    }catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}