import { DataTypes, Model, Op, Transaction } from "sequelize";
import { sequelize } from './sequelize'
import pinyin from 'pinyin'
import { AlbumAttributes, AlbumCreationAttributes } from "../types/album";


export class Album extends Model<
    AlbumAttributes, AlbumCreationAttributes
> implements AlbumAttributes {
    public id!: number;
    public name!: string;
    public title!: string | null;
    public slug!: string;
    public description?: string | null;
    public cover_photo_id?: number | null;
    public cover_photo_url?: string | null;
    public cover_photo_thumbnail_url?: string | null;
    public photo_count!: number;
    public readonly created_at!: Date;
    public updated_at!: Date;
    public creator!: string;

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

    // 更新相册照片数量
    public static async updatePhotoCount(
        albumId: number,
        change: number = 1,
        transaction: Transaction,
    ): Promise<[Album[], number?]> {
        const method = change > 0 ? 'increment' : 'decrement';
        const options = {
            by: Math.abs(change),
            where: {
                id: albumId,
                ...(change<0&&{photo_count:{ [Op.gt]: 0}})
            },
            transaction,
        }
        return await this[method]('photo_count', options);
    }
}

Album.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: new DataTypes.STRING(50),
        allowNull: false,
        validate: {
            len: [2, 50]
        }
    },
    slug: {
        type: new DataTypes.STRING(128),
        allowNull: false
    },
    title: {
        type: new DataTypes.STRING(128),
        allowNull: true,
        defaultValue: ''
    },
    description: {
        type: new DataTypes.STRING(255),
        allowNull: true
    },
    cover_photo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
    },
    cover_photo_url: {
        type: new DataTypes.STRING(255),
        allowNull: true
    },
    cover_photo_thumbnail_url: {
        type: new DataTypes.STRING(255),
        allowNull: true
    },
    photo_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
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
    },
    creator: {
        type: DataTypes.STRING(128),
        allowNull: false,
        defaultValue: 'SakiSDK',
        validate: {
            len: [2, 128]
        }
    }
}, {
    tableName: 'albums',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_album_name',
            unique: true,
            fields: ['name']
        },
        {
            name: 'idx_album_slug',
            unique: true,
            fields: ['slug']
        },
    ],
    hooks: {
        beforeUpdate: async (album: Album) => {
            // 自动更新时间
            album.updated_at = new Date();
        },
    }
})