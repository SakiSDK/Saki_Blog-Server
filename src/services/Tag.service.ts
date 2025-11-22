import { PostTag } from '../models/PostTag.model';
import { sequelize } from '../models/index';
import { Tag } from '../models/Tag.model'
import { BadRequestError, NotFoundError } from '../utils/errors'
import { Op, Transaction } from 'sequelize'


// 定义标签创建/更新的入参类型
export interface TagCreateInput {
    name: string | null;
    description?: string | null;
    order?: number | null;
}
export interface TagListQuery {
    id?: number;
    name?: string;
    description?: string;
    order?: number;
    slug?: string;
    page?: number;
    limit?: number;
    keyword?: string;
    order_by: 'created_at' | 'order' | 'post_count' | 'updated_at';
    sort?: 'ASC' | 'DESC';
}

export class TagService { 
    /**
     * 创建标签（自动生成slug，确保name/slug唯一）
     * @param data      标签创建数据
     * @returns         新创建的标签实例
     */
    public static async createTag(data: TagCreateInput): Promise<Tag> {
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
            order: data.order ? Number(data.order): 0,
            post_count: 0 // 初始无关联文章，计数为0
        });
        return tag;
    }

    /**
     * 更新标签
     * @param id 标签ID
     * @param data 
     */
    public static async updateTag(id: number, data: TagCreateInput): Promise<Tag> { 
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
    public static async deleteTag(id: number): Promise<{ message: string }>{
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
   * 4. 获取单个标签详情（支持关联查询已关联的文章）
   * @param idOrSlug 标签ID或slug（灵活查询）
   * @param withPosts 是否携带关联的文章列表
   * @param postOptions 文章查询参数（分页、状态筛选）
   * @returns 标签详情（含可选的文章列表）
   */
    // public static async getTagDetail(
    //     idOrSlug: number | string,
    //     withPosts: boolean = false,
    //     postOptions?: {
    //         limit?: number;
    //         offset?: number;
    //         status?: string;
    //     }
    // ): Promise<Tag & { posts?: { posts: Post[], total: number }}>


    
    /**
     * 获取标签列表
     * @param query 查询参数
     * @returns 标签列表+总条数
     */
    public static async getTagList(query: any): Promise<{
        tags: Tag[],
        total: number
        page: number,
        pageSize: number,
        totalPages: number,
    }>{
        // 处理默认参数
        const {
            page = 1,
            limit = 20,
            id,
            name,
            slug,
            description,
            order,
            order_by = 'created_at',
            sort = 'DESC'
        } = query;
        const offset = (page - 1) * limit;
        // 构建筛选条件
        const whereConditions: any = {};
        if (id) {
            whereConditions.id = id;
        }
        if (name?.trim()) {
            whereConditions.name = { [Op.like]: `%${name?.trim()}%` };
        }
        if (slug?.trim()) {
            whereConditions.slug = { [Op.like]: `%${slug?.trim()}%` }; 
        }
        if (description?.trim()) {
            whereConditions.description = { [Op.like]: `%${description?.trim()}%` };
        }
        if(typeof order === 'number' && order >= 0){
            whereConditions.order = order;
        }
        // 执行分页查询
        const { count, rows } = await Tag.findAndCountAll({
            where: whereConditions,
            order: [[order_by, sort]],
            offset,
            limit,
            raw: false // 关闭Sequelize的元数据处理，返回原始数据
        });
        // 返回分页结果
        return {
            tags: rows,
            total: count,
            page,
            pageSize: limit,
            totalPages: Math.ceil(count / limit),
        };
    }

    // public static async batchUpdatePostCount(tagIds?: number[]): Promise<number> {
    //     // 构建查询条件
    //     const whereCOndition = tagIds?.length ? { id: { [Op.in]: tagIds } } : {};
    //     // 查询需要更新的标签
    //     const tags = await Tag.findAll({ where: whereCOndition });
    //     if (tags.length === 0) {
    //         return 0;
    //     }
    //     for (const tag of tags) {
    //         await tag.updatePostCount();
    //     }
    //     return tags.length;
    // }
}