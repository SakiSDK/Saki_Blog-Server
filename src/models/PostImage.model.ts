import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from "./sequelize";
import { Post } from "./Post.model";
import { NotFoundError } from "../utils/errors";

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
