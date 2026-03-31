import { sequelize } from '@/models';
import { Announce } from '@/models/Announce.model';
import { AnnounceCreateBody, AnnounceListQuery, AnnounceUpdateBody } from '@/schemas/announce/announce.admin';
import { NotFoundError, BadRequestError } from '@/utils/error.util';
import { Op, Transaction } from 'sequelize';

export class AnnounceService {
  /**
   * 获取公告列表
   * @router admin/announce/list
   */
  public static async getAnnounceList(query: AnnounceListQuery) {
    const { type, priority, status } = query;
    const page = Number((query as any).page) || 1;
    const pageSize = Number((query as any).pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const { rows, count } = await Announce.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {  
      list: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 获取有效的公告列表（Web端展示用）
   * @param limit - 可选的返回数量限制，默认返回所有
   * @returns 活跃状态的公告列表，按优先级和创建时间排序
   * @description 只返回 status='active' 的公告，用于前端展示
   */
  public static async getActiveAnnounces(limit?: number): Promise<Announce[]> {
    return await Announce.findAll({
      where: { status: 'active' },
      order: [
        ['priority', 'ASC'], // high > medium > low
        ['createdAt', 'DESC']
      ],
      attributes: ['id', 'shortId', 'content', 'type', 'priority', 'createdAt'],
      limit: limit || undefined,
    });
  }

  /**
   * 获取公告详情
   * @param id - 公告ID（数字ID或shortId）
   * @returns 公告详情对象
   * @throws {NotFoundError} 当公告不存在时
   * @throws {BadRequestError} 当shortId无效时
   * @description 支持通过数字ID或shortId查询公告
   */
  public static async getAnnounceById(id: number | string): Promise<Announce> {
    let announceId: number;

    // 支持数字ID或shortId
    if (typeof id === 'string') {
      const decodedId = Announce.decodeShortId(id);
      if (!decodedId) {
        throw new BadRequestError('无效的公告短ID');
      }
      announceId = decodedId;
    } else {
      announceId = id;
    }

    const announce = await Announce.findByPk(announceId, {
      attributes: ['id', 'shortId', 'content', 'type', 'priority', 'status', 'createdAt', 'updatedAt']
    });

    if (!announce) {
      throw new NotFoundError(`公告不存在: ${id}`);
    }

    return announce;
  }

  /**
   * 创建公告
   * @param data - 公告创建数据
   * @param data.content - 公告内容（必填）
   * @param data.type - 公告类型（必填）：notice | update | reminder | news | maintenance
   * @param data.priority - 优先级（可选，默认 low）：high | medium | low
   * @param data.status - 状态（可选，默认 active）：active | inactive
   * @param transaction - 可选的事务对象，用于事务管理
   * @returns 创建成功的公告对象
   * @throws {BadRequestError} 当必填字段为空或格式不正确时
   * @throws {InternalServerError} 当数据库操作失败时
   */
  public static async createAnnounce(
    data: AnnounceCreateBody,
    transaction?: Transaction
  ): Promise<Announce> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 1. 参数验证
      if (!data.content || data.content.trim().length === 0) {
        throw new BadRequestError('公告内容不能为空');
      }

      if (!data.type) {
        throw new BadRequestError('公告类型不能为空');
      }

      // 2. 数据处理
      const announceData = {
        content: data.content.trim(),
        type: data.type,
        priority: data.priority || 'low',
        status: data.status || 'active',
      };

      // 3. 创建公告
      const announce = await Announce.create(announceData, {
        transaction: useTransaction,
      });

      // 4. 生成并更新 shortId
      const shortId = Announce.generateShortId(announce.id);
      await announce.update({ shortId }, {
        transaction: useTransaction,
      });

      if(!transaction){
        await useTransaction.commit();
      }

      return announce;
    } catch (error) {
      if(!transaction){
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 更新公告
   * @param id - 公告ID
   * @param data - 更新数据
   * @param data.content - 公告内容（可选）
   * @param data.type - 公告类型（可选）
   * @param data.priority - 优先级（可选）
   * @param data.status - 状态（可选）
   * @param transaction - 可选的事务对象
   * @returns 更新后的公告对象
   * @throws {NotFoundError} 当公告不存在时
   * @throws {BadRequestError} 当参数验证失败时
   */
  public static async updateAnnounce(
    id: number,
    data: AnnounceUpdateBody,
    transaction?: Transaction
  ): Promise<Announce> {
    const useTransaction = transaction || await sequelize.transaction();

    try {
      // 1. 获取公告
      const announce = await this.getAnnounceById(id);

      // 2. 数据处理
      const updateData: any = {};
      if (data.content !== undefined) {
        const trimmedContent = data.content.trim();
        if (trimmedContent.length === 0) {
          throw new BadRequestError('公告内容不能为空');
        }
        updateData.content = trimmedContent;
      }
      if (data.type !== undefined) {
        updateData.type = data.type;
      }
      if (data.priority !== undefined) {
        updateData.priority = data.priority;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      // 3. 更新公告
      await announce.update(updateData, { transaction: useTransaction });

      if (!transaction) {
        await useTransaction.commit();
      }

      return announce;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 删除单个公告
   * @param id - 公告ID
   * @param transaction - 可选的事务对象
   * @returns 删除结果消息
   * @throws {NotFoundError} 当公告不存在时
   */
  public static async deleteAnnounce(
    id: number,
    transaction?: Transaction
  ): Promise<{ message: string }> {
    const useTransaction = transaction || await sequelize.transaction();

    try {
      const announce = await this.getAnnounceById(id);
      await announce.destroy({ transaction: useTransaction });

      if (!transaction) {
        await useTransaction.commit();
      }

      return { message: `公告已成功删除` };
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 批量删除公告
   * @param ids - 公告ID数组
   * @param transaction - 可选的事务对象
   * @returns 删除结果，包含删除数量
   * @throws {BadRequestError} 当ID数组为空或包含无效值时
   */
  public static async bulkDeleteAnnounces(
    ids: number[],
    transaction?: Transaction
  ): Promise<{ message: string; deletedCount: number }> {
    // 参数验证
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestError('公告ID列表不能为空');
    }

    // 过滤有效的ID
    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length === 0) {
      throw new BadRequestError('没有有效的公告ID');
    }

    const useTransaction = transaction || await sequelize.transaction();

    try {
      const deletedCount = await Announce.destroy({
        where: { id: { [Op.in]: validIds } },
        transaction: useTransaction,
      });

      if (!transaction) {
        await useTransaction.commit();
      }

      return {
        message: `成功删除 ${deletedCount} 条公告`,
        deletedCount,
      };
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }
}
