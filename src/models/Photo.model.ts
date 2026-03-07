import { DataTypes, Model, Op, Optional, Transaction } from "sequelize";
import { sequelize } from './sequelize'
import { ImageService } from '@/services/Image.service';

export interface PhotoAttributes {
  /** 主键 */
  id: number;
  /** 关联相册 ID */
  albumId: number;
  /** 关联 image 表 ID */
  imageId: number;
  /** 在相册中的标题 */
  title?: string | null;    
  /** 在相册中的描述 */
  description?: string | null;
  /** 是否为封面 */
  coverStatus: 'main' | 'secondary' | 'none';
  /** 排序权重 */
  priority: number;
  /** 创新时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

export interface PhotoCreationAttributes extends Optional<PhotoAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class Photo extends Model<PhotoAttributes, PhotoCreationAttributes> implements PhotoAttributes {
  public id!: number;
  public albumId!: number;
  public imageId!: number;
  public title?: string | null;
  public description?: string | null;
  public coverStatus!: 'main' | 'secondary' | 'none';
  public priority!: number;
  public readonly createdAt!: Date;
  public updatedAt!: Date;

  /** 删除照片及其关联的图片 */
  public static async deletePhotos(ids: Photo['id'][], transaction?: Transaction): Promise<void> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 获取要删除的图片 ID
      const photos = await Photo.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['imageId'],
        transaction: useTransaction
      });

      const imageIds = photos.map(p => p.imageId);

      // 删除 Photo 记录
      await Photo.destroy({
        where: { id: { [Op.in]: ids } },
        transaction: useTransaction,
      })

      // 删除 Image 记录和文件 (动态导入 Service 避免循环依赖)
      if (imageIds.length > 0) {
        await ImageService.deleteImagesByIds(imageIds, useTransaction);
      }

      if (!transaction) {
        await useTransaction.commit();
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      
      // 抛出错误，统一到 Controller 层处理错误
      throw error;
    }
  }
}

Photo.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  albumId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'albums',
      key: 'id'
    },
    onUpdate: 'CASCADE',    // 数据库级约束：相册ID更新时级联更新
    onDelete: 'CASCADE',     // 数据库级约束：相册删除时级联删除图片
    validate: {
      notNull: {
        msg: '相册ID不能为空'
      },
      isInt: {  
        msg: '相册ID必须是一个整数'
      },
      min: {
        args: [1],
        msg: '相册ID不能小于1'
      }
    },
    comment: '相册ID',
    field: 'album_id',
  },
  imageId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'images',
      key: 'id'
    },
    onUpdate: 'CASCADE',    // 数据库级约束：图片ID更新时级联更新
    onDelete: 'CASCADE',     // 数据库级约束：图片删除时级联删除图片
    validate: {
      notNull: {
        msg: '图片ID不能为空'
      },
      isInt: {  
        msg: '图片ID必须是一个整数'
      },
      min: {
        args: [1],
        msg: '图片ID不能小于1'
      }
    },
    comment: '图片ID',
    field: 'image_id',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    validate: {
      len: {
        args: [0, 255],
        msg: '标题长度不能超过255个字符'
      }
    },
    comment: '相册标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    validate: {
      len: {
        args: [0, 1000],
        msg: '描述长度不能超过1000个字符'
      }
    },
    comment: '相册描述',
  },
  coverStatus: {
    type: DataTypes.ENUM('main', 'secondary', 'none'),
    allowNull: false,
    defaultValue: 'none',
    comment: '封面状态',
    field: 'cover_status',
  },
  priority: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '排序权重',
    field: 'priority',
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
}, {
  sequelize,
  tableName: 'photos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'photos_album_id_index',
      fields: ['album_id']
    }
  ],
  hooks: {
    afterUpdate: async (photo, options) => { 
      photo.updatedAt = new Date()
    }
  }
})