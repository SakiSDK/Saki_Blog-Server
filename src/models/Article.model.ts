import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from './sequelize'
import { ArticleCategory, ArticleTag } from './index'
import { createShortIdCodec } from '@/utils/shortId.codec';
import { config } from '@/config';
import { BadRequestError } from '@/utils/errors';

/** 文章模型属性类型定义 */
export interface ArticleAttributes {
  /** 文章ID */
  id: number;
  /** 文章短ID，用于访问文章 */
  shortId: string;
  /** 文章标题 */
  title: string;
  /** 文章描述 */
  description: string | null;
  /** 文章内容 */
  content: string | null;
  /** 文章优先级，默认值为0 */
  priority: number;
  /** 文章作者ID */
  authorId: number;
  /** 文章状态 */
  status: 'draft' | 'published';
  /** 封面图片 */
  coverPath: string | null;
  /** 封面图片缩略图 */
  coverThumbPath: string | null;
  /** 文章内插入图片的图片地址列表，JSON数组 */
  imagePaths: string[] | null;
  /** 创建时间 */
  createdAt: Date;    
  /** 更新时间 */
  updatedAt: Date;
  /** 是否允许评论 */
  allowComment: boolean;
}

// 定义创建属性，让一些必要的属性变为可选，有数据库自动生成
interface ArticleCreationAttributes extends Optional<
  ArticleAttributes,
  'id' | 'shortId' | 'authorId' | 'createdAt' | 'updatedAt' | 'imagePaths' | 'description' | 'priority'
> { }


/** 文章模型 */
export class Article extends Model<ArticleAttributes, ArticleCreationAttributes> implements ArticleAttributes {
  public id!: number;
  public shortId!: string;
  public title!: string;
  public description!: string | null;
  public content!: string;
  public priority!: number;
  public authorId!: number;   
  public status!: 'draft' | 'published';
  public coverPath!: string | null;
  public coverThumbPath!: string | null;
  public imagePaths!: string[] | null;
  public readonly createdAt!: Date;
  public updatedAt!: Date;
  /** 是否允许评论 */
  public allowComment!: boolean;

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
      await ArticleTag.deleteByPostId(postId, {
        transaction: useTransaction
      });
      await ArticleCategory.deleteByPostId(postId, {
        transaction: useTransaction
      });
      // 删除文章本身
      const deleteCount = await Article.destroy({
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

  /** 生成ShortId */
  public static generateShortId(id: number): string {
    const { encode } = createShortIdCodec(config.salt.article);
    return encode(id);
  }

  /** 解码ShortId */
  public static decodeShortId(shortId: string): number | null {
    const { decode } = createShortIdCodec(config.salt.article);
    return decode(shortId) ?? null;
  }
}

Article.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    comment: "文章ID",
  },
  shortId: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: "文章短id",
    field: "short_id",
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
    allowNull: true,
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
  priority: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: "文章优先级"
  },
  authorId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: "作者ID",
    field: "author_id",
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
  coverPath: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "文章封面图片的URL",
    field: "cover_path",
    },
  coverThumbPath: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "文章封面图片的缩略图URL",
    field: "cover_thumb_path",
  },
  imagePaths: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: "文章内插入图片的图片地址列表",
    field: "image_paths",
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: "创建时间",
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: "更新时间",
    field: "updated_at",
  },
  allowComment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "是否允许评论",
    field: "allow_comment",
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
          throw new BadRequestError('已发布的文章内容不能为空');
        }
      }
    },
    afterCreate: async (post: Article) => {

    },
    beforeUpdate: (post: Article) => {
      // 更新时自动更新时间
      post.updatedAt = new Date();
    }
  }
})
