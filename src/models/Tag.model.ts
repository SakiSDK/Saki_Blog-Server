import { DataTypes, Model, Op, Optional, Transaction } from 'sequelize';
import { sequelize } from './sequelize'
import pinyin from 'pinyin'

export interface TagAttributes {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    order: number;
    post_count: number;
    status: 'active' | 'inactive';
    created_at: Date;
    updated_at: Date;
}

interface TagCreationAttributes extends Optional<TagAttributes, 'id' | 'status' | 'created_at' | 'updated_at'> { }

export class Tag extends Model<TagAttributes, TagCreationAttributes> implements TagAttributes { 
    public id!: number;
    public name!: string;
    public slug!: string;
    public description?: string | null;
    public order!: number;
    public post_count!: number;
    public status!: 'active' | 'inactive';
    public readonly created_at!: Date;
    public updated_at!: Date;

    // 生成slug
    public static generateSlug(name: string): string {
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
    
    // 更新文章计数
    public static async updatePostCount(
        tagId: number,
        change: number = 1,
        transaction: Transaction
    ): Promise<[Tag[], number?]> {
        const method = change > 0 ? 'increment' : 'decrement';
        const options = {
            by: Math.abs(change),
            where: {
                id: tagId,
                ...(change<0&&{photo_count:{ [Op.gt]: 0}})
            },
            transaction
        }
        return await this[method]('post_count', options);
    }
}

Tag.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            comment: '标签ID'
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 50]
            },
            comment: '标签名称'
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                is: /^[a-z0-9\-]+$/, // 只允许小写字母、数字和连字符
            },
            comment: '标签别名',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '标签描述',
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '标签排序',
        },
        post_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '标签文章数',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
            comment: '标签状态',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize,
        tableName: 'tags',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {   
                name: 'idx_post_tag_name',
                fields: ['name'],
                unique: true
            },
            {
                name: 'idx_post_tag_slug',
                fields: ['slug'],
                unique: true
            }
        ],
        hooks: {
            beforeUpdate: (tag: Tag) => {
                // 更新时自动更新时间
                tag.updated_at = new Date();
            }
        }
    }
)
