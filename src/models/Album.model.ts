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
  public coverPhotoId?: number | null;
  public coverPhotoUrl?: string | null;
  public coverPhotoThumbnailUrl?: string | null;
  public photoCount!: number;
  public readonly createdAt!: Date;
  public updatedAt!: Date;
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
        ...(change<0&&{photoCount:{ [Op.gt]: 0}})
      },
      transaction,
    }
    return await this[method]('photoCount', options);
  }
}

Album.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    comment: '相册ID',
  },
  name: {
    type: new DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50]
    },
    comment: '相册名称',
  },
  slug: {
    type: new DataTypes.STRING(128),
    allowNull: false,
    comment: '相册slug',
  },
  title: {
    type: new DataTypes.STRING(128),
    allowNull: true,
    defaultValue: '',
    comment: '相册标题',
  },
  description: {
    type: new DataTypes.STRING(255),
    allowNull: true,
    comment: '相册描述',
  },
  coverPhotoId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '封面照片ID',
    field: 'cover_photo_id',
  },
  coverPhotoUrl: {
    type: new DataTypes.STRING(255),
    allowNull: true,
    comment: '封面照片URL',
    field: 'cover_photo_url',
  },
  coverPhotoThumbnailUrl: {
    type: new DataTypes.STRING(255),
    allowNull: true,
    comment: '封面照片缩略图URL',
    field: 'cover_photo_thumbnail_url',
  },
  photoCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '相册照片数',
    field: 'photo_count',
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
      album.updatedAt = new Date();
    },
  }
})