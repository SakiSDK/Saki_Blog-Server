import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from './sequelize'
import { PostCategory, PostTag } from './index'

/** 文章模型属性类型定义 */
export interface PostAttributes {
    /** 文章ID */
    id: number;
    /** 文章短ID，用于访问文章 */
    short_id: string;
    /** 文章标题 */
    title: string;
    /** 文章描述 */
    description?: string | null;
    /** 文章内容 */
    content?: string | null;
    /** 文章作者ID */
    author_id?: number;
    /** 文章状态 */
    status: 'draft' | 'published';
    /** 封面图片 */
    cover_path?: string | null;
    /** 文章内插入图片的图片地址列表，JSON数组 */
    image_paths?: string[] | null;
    /** 创建时间 */
    created_at: Date;
    /** 更新时间 */
    updated_at: Date;
}

// 定义创建属性，让一些必要的属性变为可选，有数据库自动生成
interface PostCreationAttributes extends Optional<
    PostAttributes,
    'id' | 'short_id' | 'author_id' | 'created_at' | 'updated_at' | 'image_paths' | 'description'
> { }


/** 文章模型 */
export class Post extends Model<PostAttributes, PostCreationAttributes> implements PostAttributes {
    public id!: number;
    public short_id!: string;
    public title!: string;
    public description?: string | null;
    public content!: string;
    public author_id!: number;
    public status!: 'draft' | 'published';
    public cover_path?: string | null;
    public image_paths?: string[] | null;
    public readonly created_at!: Date;
    public updated_at!: Date;
    // 删除文章并清理关联
    public static async deleteWithRelations(
        postId: number,
        options?: {
            transaction?: Transaction
        }
    ): Promise<number> {
        const useTransaction = options?.transaction ?? await sequelize.transaction();
        try {
            // 先删除关联，自动更新分类和标签计数
            await PostTag.deleteByPostId(postId, {
                transaction: useTransaction
            });
            await PostCategory.deleteByPostId(postId, {
                transaction: useTransaction
            });
            // 删除文章本身
            const deleteCount = await Post.destroy({
                where: { id: postId },
                transaction: useTransaction,
            });
            if (!options?.transaction) {
                await useTransaction.commit();
            }
            return deleteCount;
        } catch (error) {
            if (!options?.transaction) {
                await useTransaction.rollback();
            }
            throw error;
        }
    }
}

Post.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    short_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "文章短id"
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
        comment: "文章标题"
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            len: [0, 255],
        },
        comment: "文章描述"
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: "文章内容( Markdown 或者 HTML )"
    },
    author_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: "作者ID"
    },
    status: {
        type: DataTypes.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
        validate: {
            isIn: [['draft', 'published']],
        },
        comment: "文章状态"
    },
    cover_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "文章封面图片的URL"
    },
    image_paths: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "文章内插入图片的图片地址列表"
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "创建时间",
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "更新时间",
    },
}, {
    sequelize,
    tableName: 'posts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_posts_short_id',
            unique: true,
            fields: ['short_id'],
        },
    ],
    hooks: {
        beforeValidate: (post) => {
            // 只有 published 状态要求 content 非空
            if (post.status === 'published') {
                if (!post.content || post.content.trim() === '') { 
                    throw new Error('已发布的文章内容不能为空');
                }
            }
        },
        afterCreate: async (post: Post) => {

        },
        beforeUpdate: (post: Post) => {
            // 更新时自动更新时间
            post.updated_at = new Date();
        }
    }
})
