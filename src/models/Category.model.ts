import { DataTypes, Model, Op, Optional, Transaction } from "sequelize";
import { sequelize } from "./sequelize";
import pinyin from "pinyin"

export interface CategoryAttributes {
  id: number;
  name: string;       // 分类名称
  title: string | null;      // 分类标题
  slug: string;       // 分类别名
  description?: string | null;   // 分类描述
  order: number;      // 排序
  postCount: number;   // 分类下的文章数
  status: 'active' | 'inactive'; // 状态
  createdAt: Date;     // 创建时间
  updatedAt: Date;     // 更新时间
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'status' | 'postCount' | 'createdAt' | 'updatedAt'> { }

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public title!: string | null;
  public slug!: string;
  public description?: string | null;
  public order!: number;
  public postCount!: number;
  public status!: 'active' | 'inactive'; // 状态
  public readonly createdAt!: Date;
  public updatedAt!: Date;

  // 生成slug的方法
  public static generateSlug(name: string): string {
    // 生成slug
    const pinyinResult = pinyin(name, {
      style: pinyin.STYLE_NORMAL,
      heteronym: true,
    })
    const pinyinSlug = pinyinResult.flat().join('-')
    return pinyinSlug
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // 允许中文、英文、数字
      .replace(/(^-|-$)/g, '') // 移除开头和结尾的连字符
      .replace(/-+/g, '-'); // 将多个连字符替换为单个
  }

  // 更新分类文章计数的方法（带事务支持）
  public static async updatePostCount(
    categoryId: number,
    change: number = 1,
    transaction: Transaction
  ): Promise<[Category[], number?]> {
    const method = change > 0 ? 'increment' : 'decrement'
    const options = {
      by: Math.abs(change),
      where: {
        id: categoryId,
        ...(change<0&&{postCount:{ [Op.gt]: 0}})
      },
      transaction
    }
    return await this[method]('postCount', options);
  }
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 128]
      }
    },
    slug: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: { msg: '分类别名不能为空' },
        is: { args: [/^[a-z0-9-]+$/i], msg: '分类别名只能包含小写字母、数字和连字符' },
        len: { args: [2, 128], msg: '分类别名长度必须在2到128个字符之间' }
      }
    },
    title: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
    description: {
      type: new DataTypes.STRING(256),
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    postCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: '文章数',
      field: 'post_count',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
      comment: '分类状态'
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
    sequelize,
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'categories_slug_index',
        unique: true,
        fields: ['slug']
      },
      {
        name: 'categories_name_index',
        unique: true,
        fields: ['name']
      },
      {
        name: 'categories_order_index',
        fields: ['order']
      },
    ],
    hooks: {
      beforeCreate: async (category: any) => {
        category.slug = Category.generateSlug(category.name)
      },
      beforeUpdate: async (category: any) => {
        category.updatedAt = new Date()  
      },
    }
  }
)