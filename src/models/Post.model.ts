import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from './sequelize'
import { User, PostCategory, PostTag } from './index'
import path from 'path'
import fs from 'fs/promises'
import { config } from '../config/index'


export interface PostAttributes {
    id: number;
    short_id: string;                           // 短id，用于创建短链接
    title: string;                              // 标题
    post_path: string | null;                          // 内容路径
    description?: string | null;                // 文章描述
    author_id?: number;                         // 作者id
    status: 'draft' | 'published'; // 状态
    cover_path?: string | null;                // 封面图片
    image_paths?: string[] | null;               // 富文本内图片(JSON数组)
    created_at: Date;
    updated_at: Date;
}

// 定义创建属性，让一些必要的属性变为可选，有数据库自动生成
interface PostCreationAttributes extends Optional<
    PostAttributes,
    'id' | 'short_id' | 'author_id' | 'created_at' | 'updated_at' | 'image_paths' | 'description'
> { }

//这里 Model<A, B> 的两个泛型参数：
// A = PostAttributes 👉 表示 数据库里一条记录的完整样子
// B = PostCreationAttributes 👉 表示 创建时可以省略的字段
// 而 implements PostAttributes 是告诉 TypeScript：
// Post 这个类实例会拥有所有 PostAttributes 里的属性。
export class Post extends Model<PostAttributes, PostCreationAttributes> implements PostAttributes {
    public id!: number;
    public short_id!: string;
    public title!: string;
    public post_path!: string | null;
    public description?: string | null;
    public author_id!: number;
    public status!: 'draft' | 'published';
    public cover_path?: string | null;
    public image_paths?: string[] | null;
    public readonly created_at!: Date;
    public updated_at!: Date;

    // 读取Markdown内容的方法
    public async getMarkdownContent(): Promise<string> {
        try {
            if (!this.post_path) {
                throw new Error('无法读取文章内容：文章路径为空');
            }
            const fullPath = path.join(config.upload.path, this.post_path);
            return await fs.readFile(fullPath, 'utf-8');
        } catch (error: any) {
            throw new Error(`无法读取文章内容: ${error.message}`);
        }
    }

    // 更新Markdown内容的方法
    public async setContent(content: string): Promise<void> {
        try {
            if (!this.post_path) {
                throw new Error('无法更新文章内容：文章路径为空');
            }
            const fullPath = path.join(config.upload.path, this.post_path);
            await fs.writeFile(fullPath, content, 'utf-8');
        } catch (error: any) {
            throw new Error(`无法更新文章内容: ${error.message}`);
        }
    }

    // 获取封面图的完整URL
    public async getCoverImageUrl() {
        if (!this.cover_path) {
            return null
        }
        if (this.cover_path.startsWith('http')) {
            return this.cover_path
        }
        const baseUrl = config.serverUrl || `http://${config.host}:${config.port}`;
        return `${baseUrl}/uploads/covers/${this.cover_path}`;
    }

    // 获取封面图的本地绝对路径
    public getCoverImagePath(): string | null {
        if (!this.cover_path || this.cover_path.startsWith('http')) {
            return null;
        }
        return path.join(config.upload.path, 'covers', this.cover_path);
    }

    //删除封面图片文件
    public async deleteCoverImage(): Promise<void> {
        if (!this.cover_path) return;
        try {
            const imagePath = this.getCoverImagePath();
            if (imagePath) {
                await fs.unlink(imagePath);
            }
            await this.save();
        } catch (error: any) {
            if(error.code !== 'ENOENT') {
                console.warn('删除封面图片文件失败:', error.message);
            }
        }
    }
    
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
    post_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: '文章内容路径',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            len: [0, 255],
        },
        comment: "文章描述"
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
        afterCreate: async (post: Post) => {
            
        },
        beforeUpdate: (post: Post) => {
            // 更新时自动更新时间
            post.updated_at = new Date();
        }
    }
})
