import { Model, DataTypes, Optional, Transaction } from 'sequelize';
import { sequelize } from './sequelize';
import { config } from '@/config';


/** 图片模型属性类型定义 */
export interface ImageAttributes {
  /** 图片 ID */
  id: number;
  /** 图片路径或URL */
  path: string;
  /** 图片大小 */
  size: number;
  /** 图片类型 */
  type: string;
  /** 如果图片是属于某篇文章，可以关联文章 ID */
  postId: number | null;
  /** 上传者的用户 ID */
  userId: number | null;
  /** 存储位置 */
  storage: 'local' | 'oss';
  /** 上传时间 */
  uploadedAt: Date;
}

interface ImageCreationAttributes extends Optional<ImageAttributes, 'id' | 'uploadedAt'> { }

/** 图片模型 */
export class Image extends Model<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
  public id!: number;
  public path!: string;
  public size!: number;
  public type!: string;
  public postId!: number | null;
  public userId!: number | null;
  public storage!: 'local' | 'oss';
  public uploadedAt!: Date;

}

Image.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    comment: '图片ID',
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      len: [1, 500],
    },
    comment: '图片路径或URL',
  },
  size: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: 1,
    },
    comment: '图片大小(单位: 字节)',
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      // 业务约束
      isIn: [config.upload.allowedImageTypes]
    },
    comment: '图片类型',
  },
  postId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '关联的文章ID',
    field: 'post_id',
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '上传者的用户ID',
    field: 'user_id',
  },
  storage: {
    type: DataTypes.ENUM('local', 'oss'),
    allowNull: false,
    defaultValue: 'local',
    comment: '存储位置',
    field: 'storage',
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW, // 数据库自动填充当前时间
    comment: '上传时间',
    field: 'uploaded_at',
  },
},{
  sequelize,
  tableName: 'images',
  timestamps: false,
  // 加索引，快速查询，性能保障
  indexes: [
    {
      name: 'idx_images_post_id',
      fields: ['post_id'],
    },
    {
      name: 'idx_images_user_id',
      fields: ['user_id'],
    },
    {
      name: 'idx_images_uploaded_at',
      fields: ['uploaded_at'],
    },
    // 联合索引：按文章+时间查询
    {
      name: 'idx_images_post_uploaded',
      fields: ['post_id', 'uploaded_at'],
    }
  ],
  comment: '图片资源表（支持文章/用户关联）',
})