import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from "./sequelize";
import { Post, Category } from "../models/index";

export interface PostCategoryAttributes {
    post_id: number;
    category_id: number;
    created_at: Date;
    updated_at: Date;
}

interface PostCategoryCreationAttributes extends Optional<PostCategoryAttributes,  'created_at' | 'updated_at'> { }

export class PostCategory extends Model<PostCategoryAttributes, PostCategoryCreationAttributes> implements PostCategoryAttributes {
    public post_id!: number;
    public category_id!: number;
    public readonly created_at!: Date;
    public updated_at!: Date;

    //关联对象
    public readonly post?: Post;
    public readonly category?: Category;

    // 创建关联并更新分类计划（带事务）
    public static async createWithCount(
        data: {
            post_id: number;
            category_id: number;
        },
        transaction?: Transaction
    ): Promise<PostCategory>{
        const useTransaction = transaction ? transaction : await sequelize.transaction()
        try {
            const existing = await this.findOne({
                where: {
                    post_id: data.post_id,
                    category_id: data.category_id
                },
                transaction: useTransaction
            })
            if (existing) {
                if (!transaction) await useTransaction.commit()
                return existing
            }
            // 创建关联记录
            const postCategory = await this.create(data, {
                transaction: useTransaction
            });
            // 更新分类计数
            await Category.updatePostCount(data.category_id, 1, useTransaction);
            if (!transaction) {
                await useTransaction.commit()
            }
            return postCategory
        } catch (error) {
            if (!transaction) {
                await useTransaction.rollback()
            }
            throw error
        }
    }

    // 批量创建创建关联并更新分类计划（带事务）
    static async bulkCreateWithCount(
        data: {
            post_id: number;
            category_ids: number[];
        },
        options?: {
            transaction?: Transaction;
        }
    ): Promise<PostCategory[]> {
        const useTransaction = options?.transaction ?? await sequelize.transaction()
        try {
            const postCategories = await this.bulkCreate(data.category_ids.map(categoryId => ({
                post_id: data.post_id,
                category_id: categoryId
            })), {
                transaction: useTransaction,
                ignoreDuplicates: true, // 忽略重复的关联
            });
            // 提取唯一的分类ID并更新计数
            for (const category_id of data.category_ids) {
                // 判断当前分类字段是否存在
                const category = await Category.findByPk(category_id)
                if (!category) {
                    throw new Error('当前分类字段不存在')
                }
                await Category.updatePostCount(category_id, 1, useTransaction);
            }
            if (!options?.transaction) {
                await useTransaction.commit()
            }
            return postCategories
        }catch (error) {
            if (!options?.transaction) {
                await useTransaction.rollback()
            }
            throw error
        }
    }

    // 删除关联并更新分类计划（带事务）
    public static async deleteByPostId(
        postId: number,
        options?: {
            transaction?: Transaction;
        }
    ): Promise<number> {
        const useTransaction = options?.transaction ?? await sequelize.transaction()    
        try {
            const postCategories = await this.findAll({
                where: {
                    post_id: postId
                },
                transaction: useTransaction
            })
            if (postCategories.length === 0) {
                if (!options?.transaction) await useTransaction.commit()
                return 0
            }
            // 删除关联记录
            const deletedCount = await this.destroy({
                where: {
                    post_id: postId
                },
                transaction: useTransaction
            })
            for (const postCategory of postCategories) {
                await Category.updatePostCount(postCategory.category_id, -1, useTransaction);
            }
            if (!options?.transaction) {
                await useTransaction.commit()
            }
            return deletedCount
        } catch (error) {
            if (!options?.transaction) {
                await useTransaction.rollback()
            }
            throw error
        }
    }

    // 根据分类ID删除关联并更新分类计划（带事务）
    public static async deleteByCategoryId(
        categoryId: number,
        options?: {
            transaction?: Transaction;
        }
    ): Promise<number>{
        const useTransaction = options?.transaction ?? await sequelize.transaction()
        try {
            const postCategorys = await this.findAll({
                where: {
                    category_id: categoryId
                },
                transaction: useTransaction
            })
            if (postCategorys.length === 0) {
                if (!options?.transaction) await useTransaction.commit()
                return 0
            }
            // 删除关联记录
            const deletedCount = await this.destroy({
                where: {
                    category_id: categoryId
                },
                transaction: useTransaction
            })
            for (const postCategory of postCategorys) {
                await Category.updatePostCount(postCategory.category_id, -1, useTransaction);
            }
            if (!options?.transaction) {
                await useTransaction.commit()
            }
            return deletedCount
        } catch (error) {
            if (!options?.transaction) {
                await useTransaction.rollback()
            }
            throw error
        }
    }
}

PostCategory.init(
    {
        post_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'posts',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            validate: {
                notNull: {
                    msg:  '文章ID不能为空'
                },
                isInt: {
                    msg: '文章ID必须是一个整数'
                },
                min: {
                    args: [1],
                    msg: '文章ID不能小于1'
                }
            },
        },
        category_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'categories',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            validate: {
                notNull: {
                    msg: '文章分类ID不能为空'
                },
                isInt: {
                    msg: '文章分类ID必须是一个整数'
                },
                min: {
                    args: [1],
                    msg: '文章分类ID不能小于1'
                }
            },
            comment: '文章分类ID'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: '创建时间'
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: '更新时间'
        }
    },
    {
        sequelize,              // 数据库连接实例
        tableName: 'post_categories',     // 表名
        timestamps: true,       // 是否启用时间戳
        underscored: true,      // 是否使用下划线命名
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'post_categories_post_id_category_id_index',
                unique: true, // 防止重复关联
                fields: ['post_id', 'category_id']
            },
        ],
        hooks: {
            afterUpdate: async (postCategory: PostCategory) => {
                postCategory.updated_at = new Date()
            }
        }
    }
)

