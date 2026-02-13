import { DataTypes, Model, Optional, Op, Transaction } from 'sequelize'
import { sequelize } from './sequelize'
import { Article } from './Article.model'
import { Tag } from './Tag.model'
import { BadRequestError, NotFoundError } from '@/utils/errors';

export interface ArticleTagAttributes {
  postId: number;
  tagId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleTagCreationAttributes extends Optional<ArticleTagAttributes, 'createdAt' | 'updatedAt'> { }

export class ArticleTag extends Model<ArticleTagAttributes, ArticleTagCreationAttributes> implements ArticleTagAttributes {
  public postId!: number;
  public tagId!: number;
  public readonly createdAt!: Date;
  public updatedAt!: Date;

  // 关联对象
  public readonly post?: Article;
  public readonly tag?: Tag;

  // 创建关联并更新标签的计数
  public static async createWithCount(
    data: {
      postId: number;
      tagId: number;
    },
    options?: {
      transaction?: Transaction;
    }
  ): Promise<ArticleTag> { 
    const useTransaction = options?.transaction ?? await sequelize.transaction()
    try {
      const existing = await ArticleTag.findOne({
        where: {
          postId: data.postId,
          tagId: data.tagId
        }
      })
      if (existing) {
        if (!options?.transaction) {
          await useTransaction.rollback()
        }
        return existing
      }
      const postTag = await this.create(data, { transaction: useTransaction })
      await Tag.updatePostCount(data.tagId, 1, useTransaction)
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
      postId: number;
      tagIds: number[];
    },
    options?: {
      transaction?: Transaction;
    }
  ): Promise<ArticleTag[]> {
    const useTransaction = options?.transaction ?? await sequelize.transaction()
    try {
      const articleTags = await this.bulkCreate(data.tagIds.map(tagId => ({
        postId: data.postId,
        tagId: tagId
      })), {
        transaction: useTransaction,
        ignoreDuplicates: true, // 忽略重复的关联
      });
      // 提取唯一的分类ID并更新计数
      for (const tagId of data.tagIds) {
        // 判断当前分类字段是否存在
        const tag = await Tag.findByPk(tagId)
        if (!tag) {
          throw new NotFoundError('当前标签不存在')
        }
        await Tag.updatePostCount(tagId, 1, useTransaction);
      }
      if (!options?.transaction) {
        await useTransaction.commit()
      }
      return articleTags;
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
          postId: postId
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
          postId: postId
        },
        transaction: useTransaction
      })
      for (const postTag of postTags) {
        await Tag.updatePostCount(postTag.tagId, -1, useTransaction);
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
          tagId: tagId
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
          tagId: tagId   
        },
        transaction: useTransaction
      })
      for (const postTag of postTags) {
        await Tag.updatePostCount(postTag.tagId, -1, useTransaction);
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

ArticleTag.init(
  {
    postId: {
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
      comment: '文章ID',
      field: 'post_id',
    },
    tagId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'tags',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      validate: {
        notNull: {
          msg: '标签ID不能为空'
        },
        isInt: {
          msg: '标签ID必须是一个整数'
        },
        min: {
          args: [1],
          msg: '标签ID不能小于1'
        }
      },
      comment: '标签ID',
      field: 'tag_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间',
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间',
      field: 'updated_at'
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
      beforeCreate: async (articleTag: ArticleTag) => {
        const existing = await ArticleTag.findOne({
          where: {
            postId: articleTag.postId,
            tagId: articleTag.tagId
          }
        })
        if (existing) {
          throw new BadRequestError('文章和关联标签已经存在')
        }
        //检测文章是否存在
        const post = await Article.findByPk(articleTag.postId)
        if (!post) {
          throw new NotFoundError('文章不存在')
        }
        //检查标签是否存在
        const tag = await Tag.findByPk(articleTag.tagId)
        if (!tag) {
          throw new NotFoundError('标签不存在')
        }
      },
      afterUpdate: async (articleTag: ArticleTag) => {
        //检查文章是否存在
        const post = await Article.findByPk(articleTag.postId)
        if (!post) {
          throw new NotFoundError('文章不存在')
        }
        articleTag.updatedAt = new Date()
      },
    }
  }
)
