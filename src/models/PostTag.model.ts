import { DataTypes, Model, Optional, Op, Transaction } from 'sequelize'
import { sequelize } from './sequelize'
import { Post } from './Post.model'
import { Tag } from './Tag.model'

export interface PostTagAttributes {
    post_id: number;
    tag_id: number;
    created_at: Date;
    updated_at: Date;
}

export interface PostTagCreationAttributes extends Optional<PostTagAttributes, 'created_at' | 'updated_at'> { }

export class PostTag extends Model<PostTagAttributes, PostTagCreationAttributes> implements PostTagAttributes {
    public post_id!: number;
    public tag_id!: number;
    public readonly created_at!: Date;
    public updated_at!: Date;

    // 关联对象
    public readonly post?: Post;
    public readonly tag?: Tag;

    // 创建关联并更新标签的计数
    public static async createWithCount(
        data: {
            post_id: number;
            tag_id: number;
        },
        options?: {
            transaction?: Transaction;
        }
    ): Promise<PostTag> { 
        const useTransaction = options?.transaction ?? await sequelize.transaction()
        try {
            const existing = await PostTag.findOne({
                where: {
                    post_id: data.post_id,
                    tag_id: data.tag_id
                }
            })
            if (existing) {
                if (!options?.transaction) {
                    await useTransaction.rollback()
                }
                return existing
            }
            const postTag = await this.create(data, { transaction: useTransaction })
            await Tag.updatePostCount(data.tag_id, 1, useTransaction)
            if (!options?.transaction) {
                await useTransaction.commit()
            }
            return postTag;
        } catch (error) {
            if (!options?.transaction) {
                await useTransaction.rollback()
            }
            throw error
        }
    }

    // 批量创建并更新标签的计数
    static async bulkCreateWithCount(
        data: {
            post_id: number;
            tag_ids: number[];
        },
        options?: {
            transaction?: Transaction;
        }
    ): Promise<PostTag[]> {
        const useTransaction = options?.transaction ?? await sequelize.transaction()
        try {
            const postCategories = await this.bulkCreate(data.tag_ids.map(tagId => ({
                post_id: data.post_id,
                tag_id: tagId
            })), {
                transaction: useTransaction,
                ignoreDuplicates: true, // 忽略重复的关联
            });
            // 提取唯一的分类ID并更新计数
            for (const tag_id of data.tag_ids) {
                // 判断当前分类字段是否存在
                const tag = await Tag.findByPk(tag_id)
                if (!tag) {
                    throw new Error('当前标签不存在')
                }
                await Tag.updatePostCount(tag_id, 1, useTransaction);
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

    // 根据文章ID删除关联并更新标签文章计数（带事务）
    public static async deleteByPostId(
        postId: number,
        options?: {
            transaction?: Transaction;
        }
    ): Promise<number> {
        const useTransaction = options?.transaction ?? await sequelize.transaction()
        try {
            const postTags = await this.findAll({
                where: {
                    post_id: postId
                },
                transaction: useTransaction
            })
            if (postTags.length === 0) {
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
            for (const postTag of postTags) {
                await Tag.updatePostCount(postTag.tag_id, -1, useTransaction);
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
    
    // 根据分类ID删除关联并更新标签文章计数（带事务）
    public static async deleteByTagId(
        tagId: number,
        options?: {
            transaction?: Transaction;
        }
    ): Promise<number>{
        const useTransaction = options?.transaction ?? await sequelize.transaction()    
        try {
            const postTags = await this.findAll({
                where: {
                    tag_id: tagId
                },
                transaction: useTransaction
            })
            if (postTags.length === 0) {
                if (!options?.transaction) await useTransaction.commit()
                return 0
            }
            // 删除关联记录
            const deletedCount = await this.destroy({
                where: {
                    tag_id: tagId
                },
                transaction: useTransaction
            })
            for (const postTag of postTags) {
                await Tag.updatePostCount(postTag.tag_id, -1, useTransaction);
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

PostTag.init(
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
            }
        },
        tag_id: {
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
            }
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
        sequelize,
        tableName: 'post_tags',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'post_tags_post_id_tag_id_index',
                unique: true, // 防止重复关联
                fields: ['post_id', 'tag_id']
            },
            {
                name: 'post_tags_post_id_index',
                fields: ['post_id']
            },
            {
                name: 'post_tags_tag_id_index',
                fields: ['tag_id']
            },
            {
                name: 'post_tags_created_at_index',
                fields: ['created_at']
            },
            {
                name: 'post_tags_updated_at_index',
                fields: ['updated_at']
            }
        ],
        hooks: {
            beforeCreate: async (postTag: PostTag) => {
                const existing = await PostTag.findOne({
                    where: {
                        post_id: postTag.post_id,
                        tag_id: postTag.tag_id
                    }
                })
                if (existing) {
                    throw new Error('文章和关联标签已经存在')
                }
                //检测文章是否存在
                const post = await Post.findByPk(postTag.post_id)
                if (!post) {
                    throw new Error('文章不存在')
                }
                //检查标签是否存在
                const tag = await Tag.findByPk(postTag.tag_id)
                if (!tag) {
                    throw new Error('标签不存在')
                }
            },
            afterUpdate: async (postTag: PostTag) => {
                //检查文章是否存在
                const post = await Post.findByPk(postTag.post_id)
                if (!post) {
                    throw new Error('文章不存在')
                }
                postTag.updated_at = new Date()
            },
        }
    }
)
