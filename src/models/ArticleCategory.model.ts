import { DataTypes, Model, Optional, Transaction } from "sequelize";
import { sequelize } from "./sequelize";
import { Article, Category } from "../models/index";
import { NotFoundError } from '@/utils/errors';

export interface ArticleCategoryAttributes {
  postId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ArticleCategoryCreationAttributes extends Optional<ArticleCategoryAttributes,  'createdAt' | 'updatedAt'> { }

export class ArticleCategory extends Model<ArticleCategoryAttributes, ArticleCategoryCreationAttributes> implements ArticleCategoryAttributes {
  public postId!: number;
  public categoryId!: number;
  public readonly createdAt!: Date;
  public updatedAt!: Date;

  //关联对象
  public readonly post?: Article;
  public readonly category?: Category;

  // 创建关联并更新分类计划（带事务）
  public static async createWithCount(
    data: {
      postId: number;
      categoryId: number;
    },
    transaction?: Transaction
  ): Promise<ArticleCategory>{
    const useTransaction = transaction ? transaction : await sequelize.transaction()
    try {
      const existing = await this.findOne({
        where: {
          postId: data.postId,
          categoryId: data.categoryId
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
      await Category.updatePostCount(data.categoryId, 1, useTransaction);
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
      postId: number;
      categoryIds: number[];
    },
    options?: {
      transaction?: Transaction;
    }
  ): Promise<ArticleCategory[]> {
    const useTransaction = options?.transaction ?? await sequelize.transaction()
    try {
      const articleCategories = await this.bulkCreate(data.categoryIds.map(categoryId => ({
        postId: data.postId,
        categoryId
      })), {
        transaction: useTransaction,
        ignoreDuplicates: true, // 忽略重复的关联
      });
      // 提取唯一的分类ID并更新计数
      for (const categoryId of data.categoryIds) {
        // 判断当前分类字段是否存在
        const category = await Category.findByPk(categoryId);
        if (!category) {
          throw new NotFoundError('当前分类字段不存在')
        }
        await Category.updatePostCount(categoryId, 1, useTransaction);
      }
      if (!options?.transaction) {
        await useTransaction.commit()
      }
      return articleCategories
    } catch (error) {
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
      const articleCategories = await this.findAll({
        where: {
          postId: postId
        },
        transaction: useTransaction
      })
      if (articleCategories.length === 0) {
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
      for (const articleCategory of articleCategories) {
        await Category.updatePostCount(articleCategory.categoryId, -1, useTransaction);
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
      const articleCategories = await this.findAll({
        where: {
          categoryId: categoryId
        },
        transaction: useTransaction
      })
      if (articleCategories.length === 0) {
        if (!options?.transaction) await useTransaction.commit()
        return 0
      }
      // 删除关联记录
      const deletedCount = await this.destroy({
        where: {
          categoryId: categoryId
        },
        transaction: useTransaction
      })
      for (const articleCategory of articleCategories) {
        await Category.updatePostCount(articleCategory.categoryId, -1, useTransaction);
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

ArticleCategory.init(
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
    categoryId: {
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
      comment: '文章分类ID',
      field: 'category_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间',
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间',
      field: 'updated_at',
    }
  },
  {
    sequelize,        // 数据库连接实例
    tableName: 'post_categories',   // 表名
    timestamps: true,     // 是否启用时间戳
    underscored: true,    // 是否使用下划线命名
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'post_categories_post_id_category_id_index',
        unique: true, // 防止重复关联
        fields: ['post_id', 'category_id'],
      },
    ],
    hooks: {
      afterUpdate: async (articleCategory: ArticleCategory) => {
        articleCategory.updatedAt = new Date()
      }
    }
  }
)

