import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from "./sequelize";
import { Post } from "./Post.model";
import path from "path";
import fs from "fs/promises";
import { config } from "../config/index";
import { InternalServerError, NotFoundError } from "../utils/errors";

export interface PostImageAttributes {
    id: number;
    post_id: number;
    image_path: string;
    alt_text?: string | null;
    created_at: Date;
    updated_at: Date;
}

interface PostImageCreationAttributes extends Optional<PostImageAttributes, 'id'|'alt_text'> { }

export class PostImage extends Model<PostImageAttributes, PostImageCreationAttributes> implements PostImageAttributes {
    public id!: number;
    public post_id!: number;
    public image_path!: string;
    public alt_text?: string | null;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;

    // 批量创建图片和post关联
    public static async bulkCreatePostImage(
        data: {
            postId: number,
            imagePaths: string[],
        },
        options?: {
            transaction?: Transaction
        }
    ): Promise<PostImage[]>{
        const useTransaction = options?.transaction ?? await sequelize.transaction();
        try {
            const post = await Post.findByPk(data.postId, {
                transaction: useTransaction
            });
            if (!post) {
                throw new NotFoundError('文章未找到');
            }
            const postImages = await PostImage.bulkCreate(
                data.imagePaths.map((imagePath, index) => ({
                    post_id: data.postId,
                    image_path: imagePath,
                })) as PostImageCreationAttributes[],
                {
                    transaction: useTransaction,
                }
            );
            return postImages;
        } catch (error) {
            console.error('图片文章关联创建失败',error)
            throw error;
        }
    }

    //获取图片Buffer内容
    public async getImageBuffer(): Promise<Buffer> {
        try {
            const fullPath = path.join(config.upload.path, 'images', this.image_path);
            return await fs.readFile(fullPath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new NotFoundError('图片文件不存在');
            }
            throw new InternalServerError('读取图片失败', { originalError: error.message });
        }
    }

    //获取图片的Base64编码
    public async getImageBase64(): Promise<string> {
        try {
            const buffer = await this.getImageBuffer();
            return buffer.toString('base64');
        } catch (error: any) {
            throw new InternalServerError('转化图片为Base64失败', { originalError: error.message });
        }
    }

    //获取图片的完整URL
    public async getImageUrl(): Promise<string> {
        if (this.image_path.startsWith('http')) {
            return this.image_path
        }
        const baseUrl = config.serverUrl || `http://${config.host}:${config.port}`; 
        return `${baseUrl}/uploads/images/${this.image_path}`;
    }

    // 获取图片信息（MIME类型等）
    public getImageInfo(): { extension: string; mimeType: string } {
        const extension = path.extname(this.image_path).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        };

        return {
            extension,
            mimeType: mimeTypes[extension] || 'application/octet-stream'
        };
    }

    // 删除图片文件
    public async deleteImageFile(): Promise<void> {
        try {
            const fullPath = path.join(config.upload.path, this.image_path);
            await fs.unlink(fullPath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') { // 文件不存在时不报错
                console.warn('删除图片文件失败:', error.message);
            }
        }
    }
}


PostImage.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    post_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: Post,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    image_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
            notEmpty: true,
        },
        comment: '图片存储路径'
    },
    alt_text: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: 'post image',
        comment: '图片alt文本'
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
}, {
    sequelize,
    tableName: 'post_images',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['post_id']
        },
    ],
})
