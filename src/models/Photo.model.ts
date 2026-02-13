import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from './sequelize'

export interface PhotoAttributes {
  id: number;       // 图片ID
  albumId: number;   // 相册ID
  title?: string | null;    
  description?: string | null;
  imageUrl: string;
  thumbnailUrl?: string | null;
  size: number;
  width: number;
  height: number;
  format: string;
  uploader: string;
  isCover: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoCreationAttributes extends Optional<PhotoAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class Photo extends Model<PhotoAttributes, PhotoCreationAttributes> implements PhotoAttributes {
  public id!: number;
  public albumId!: number;
  public title?: string | null;
  public description?: string | null;
  public imageUrl!: string;
  public thumbnailUrl?: string | null;
  public size!: number;
  public width!: number;
  public height!: number;
  public format!: string;
  public uploader!: string;
  public isCover!: boolean;
  public readonly createdAt!: Date;
  public updatedAt!: Date;
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
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notNull: {
        msg: '图片URL不能为空'
      },
      len: {
        args: [0, 500],
        msg: '图片URL长度不能超过500个字符'
      }
    },
    comment: '图片URL',
    field: 'image_url',
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    defaultValue: '',
    validate: {
      len: {
        args: [0, 500],
        msg: '缩略图URL长度不能超过500个字符'
      }
    },
    comment: '缩略图URL',
    field: 'thumbnail_url',
  },
  size: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: '图片大小不能小于1KB'
      }
    },
    comment: '图片大小(KB)'
  },
  width: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: '图片宽度不能小于1px'
      }
    },
    comment: '图片宽度(px)'
  },
  height: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: '图片高度不能小于1px'
      }
    },
    comment: '图片高度(px)'
  },
  format: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: {
        args: [['jpg', 'jpeg', 'png', 'gif', 'webp']],
        msg: '不支持的图片格式(仅支持jpg/jpeg/png/webp/gif)'
      }
    },
    comment: '图片格式',
  },
  uploader: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'SakiSDK',
    comment: '上传人(名称或者ID)',
  },
  isCover: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为封面图片',
    field: 'is_cover',
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
  tableName: 'album_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'album_images_album_id_index',
      fields: ['album_id']
    }
  ],
  hooks: {
    afterUpdate: async (photo, options) => { 
      photo.updatedAt = new Date()
    }
  }
})