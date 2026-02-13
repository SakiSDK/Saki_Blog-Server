import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "./sequelize";
import { User } from './User.model'
import { Comment } from './Comment.model'

export interface CommentLikeAttributes {
  id: number;
  comment_id: number;
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

export type CommentCreationAttributes = Optional<CommentLikeAttributes, 'id' | 'created_at' | 'updated_at'>;

export class CommentLike extends Model<CommentLikeAttributes, CommentCreationAttributes> implements CommentLikeAttributes {
  public id!: number;
  public comment_id!: number;
  public user_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CommentLike.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    comment_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Comment,
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'comment_likes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['comment_id'] },
      { fields: ['user_id'] },
      { fields: ['comment_id', 'user_id'], unique: true }//防止重复点赞
    ]
  }
)
