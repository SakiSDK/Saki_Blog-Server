import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from './sequelize'
import { createShortIdCodec } from '@/utils/shortId.codec';
import { config } from '@/config';

export interface AnnounceAttributes {
  id: number;
  shortId?: string;
  content: string;
  type: 'notice' | 'update' | 'reminder' | 'news' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface AnnounceCreationAttributes extends Optional<AnnounceAttributes, 'id' | 'shortId' | 'priority' | 'status' | 'createdAt' | 'updatedAt'> {}

export class Announce extends Model<AnnounceAttributes, AnnounceCreationAttributes> implements AnnounceAttributes {
  public id!: number;
  public shortId!: string;
  public content!: string;
  public type!: 'notice' | 'update' | 'reminder' | 'news' | 'maintenance';
  public priority!: 'high' | 'medium' | 'low';
  public status!: 'active' | 'inactive';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /** 生成 ShortId */
  public static generateShortId(id: number): string {
    const { encode } = createShortIdCodec(config.salt.announce);
    return encode(id);
  }

  /** 解码 ShortId */
  public static decodeShortId(shortId: string): number | null {
    const { decode } = createShortIdCodec(config.salt.announce);
    return decode(shortId) ?? null;
  }
}

Announce.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    shortId: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '公告短ID',
      field: 'short_id',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '公告内容',
    },
    type: {
      type: DataTypes.ENUM('notice', 'update', 'reminder', 'news', 'maintenance'),
      allowNull: false,
      comment: '公告类型',
    },
    priority: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false,
      defaultValue: 'low',
      comment: '优先级',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    }
  },
  {
    sequelize,
    tableName: 'announces',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_announces_short_id',
        unique: true,
        fields: ['short_id'],
      },
    ],
  }
);
