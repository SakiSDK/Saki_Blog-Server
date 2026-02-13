import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from './sequelize'
import { Article } from './Article.model'
import { User } from './User.model'


// 定义「回复」的类型（平级，带parent_id）
export interface CommentReply extends Omit<CommentAttributes, 'content' | 'postId' | 'userId' | 'userIp' | 'updatedAt' | 'status'> {
  content: string; // 格式化后的内容
  user?: Pick<User, 'nickname' | 'avatar' | 'shortId'>;
}

// 定义「主评论」的类型（根评论，replies平级包含所有回复）
export interface MainComment extends Omit<CommentAttributes, 'content' | 'parentId' | 'postId' | 'userId' | 'userIp' | 'updatedAt' | 'status'> {
  content: string; // 格式化后的内容
  user?: Pick<User, 'nickname' | 'avatar' | 'shortId'>;
  replies: CommentReply[]; // 平级存放所有回复（直接+间接）
}

export interface CommentAttributes {
  id: number;   
  content: string;    // 评论内容
  postId: number;    // 文章ID
  userId: number;    // 用户ID
  parentId?: number;   // 父级评论ID
  status: 'pending' | 'approved' | 'rejected';
  isAuthor: boolean;   // 是否是作者
  userDevice?: string;   // 用户设备
  userBrowser?: string;  // 用户浏览器信息
  userRegion?: string; // 用户所在地
  userIp?: string;
  createdAt: Date;     
  updatedAt: Date;
}

interface CommentCreationAttributes
  extends Optional<CommentAttributes,
    'id' | 'createdAt' | 'updatedAt' | 'status' | 'parentId' |
    'isAuthor' | "userDevice" | "userBrowser" | "userRegion" |
    "userIp"
  > { }

export class Comment extends Model<CommentAttributes, CommentCreationAttributes> implements CommentAttributes { 
  public id!: number;
  public content!: string;
  public postId!: number;
  public userId!: number;
  public parentId?: number;
  public status!: 'pending' | 'approved' | 'rejected';
  public likesCount!: number;
  public isAuthor!: boolean;
  public userDevice?: string;
  public userBrowser?: string;
  public userRegion?: string;
  public userIp?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;


  //关联对象(会在查询时填充)
  public readonly user?: User;
  public readonly post?: Article;
  public readonly parent?: Comment;
  public readonly replies?: Comment[];


  /**
   * 格式化评论内容（Markdown基础解析+安全过滤）
   * @description 支持：换行、链接、粗体、斜体
   */
  public formatContent(): string {
    if (!this.content) return '';
    let formatted = this.content
      // 换行转 <br>
      .replace(/\n/g, '<br>')
      // Markdown链接 [文本](链接) → <a> 标签（仅允许http/https）
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, 
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="comment-link">$1</a>')
      // 粗体 **文本** → <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong class="comment-bold">$1</strong>')
      // 斜体 *文本* → <em>
      .replace(/\*(.*?)\*/g, '<em class="comment-italic">$1</em>');
    
    // 最终安全过滤（防止恶意HTML）
    formatted = formatted.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return formatted;
  }

  public static async getMainCommentsWithFlatReplies(
    postId: number,
    options: {
      page?: number,
      pageSize?: number,
      includePending?: boolean,
    } = {}
  ): Promise<{
    comments: MainComment[],
    total: number
  }> {
    const { page = 1, pageSize = 10, includePending = false } = options;
    const offset = (page - 1) * pageSize;

    // 查询该文章所有有效评论（主评论+所有层级回复）
    const whereCondition: any = { postId: postId };
    if (!includePending) whereCondition.status = 'approved';
    
    const allComments = await Comment.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nickname', 'avatar', 'shortId'], // 只返回必要字段
          required: false,
        },
        // 新增 Article 关联，获取 shortId
        {
          model: Article,
          as: 'post',
          attributes: [['shortId', 'postShortId']], // 只返回必要字段
          required: false,
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['postId', 'userId', 'status', 'userIp', 'updatedAt', 'status'] }, // 排除不必要的字段
    });
    console.log(allComments)

    // 分离主评论和回复
    const mainCommentsRaw = allComments.filter(comment => !comment.parentId) // 主评论：parentId为null
    const allRepliesRaw = allComments.filter(comment => comment.parentId); // 所有回复：parentId不为null

    // 格式化数据：主评论+评级回复（replies数组平级）
    const formattedMainComments: MainComment[] = mainCommentsRaw.map(mainComment => {
      // 格式化主评论自身内容
      const rawComment = mainComment.toJSON();
      const mainCommentData: MainComment = {
        ...rawComment,
        replies: [],
      }
      mainCommentData.content = mainComment.formatContent();
      mainCommentData.replies = []; // 初始化平级回复数组

      // 收集当前主评论下的所有回复（直接+间接）
      // 逻辑：回复的parent_id要么是主评论ID，要么是其他回复的ID（且这些回复的最终父级是当前主评论）
      const getRepliesForMainComment = (mainCommentId: number): CommentReply[] => {
        // 递归收集所有以当前主评论为根的回复（但最终平级存放）
        const findReplies = (parentIds: number[]): CommentReply[] => {
          const replies = allRepliesRaw
            .filter(reply => parentIds.includes(reply.parentId!)) // 父ID在目标列表中
            .map(reply => {
              const replyData = reply.toJSON() as CommentReply;
              replyData.content = reply.formatContent();
              return replyData;
            });

          // 查找这些回复的子回复（父ID是当前回复的ID）
          const childParentIds = replies.map(reply => reply.id);
          const childReplies = childParentIds.length > 0 ? findReplies(childParentIds) : [];
          
          return [...replies, ...childReplies];
        };

        // 1. 收集所有回复 2. 统一按 createdAt 排序（核心步骤）
        const allReplies = findReplies([mainCommentId]);
        return allReplies.sort((a, b) => {
          // 兼容 createdAt 是字符串/Date/时间戳的情况，转成时间戳比较
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA; // 升序（旧回复在前，新回复在后）
          // 若需要降序（新回复在前），则改为：return timeB - timeA;
        });
      };

      // 给当前主评论分配所有相关回复（平级）
      mainCommentData.replies = getRepliesForMainComment(mainComment.id);
      return mainCommentData;
    });

    // 主评论分页（replies数组全量返回，不分页）
    const total = allComments.length;
    const paginatedComments = formattedMainComments.slice(offset, offset + pageSize);

    return { comments: paginatedComments, total };
  }
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 2000],
      },
      comment: '评论内容'
    },
    postId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: '文章ID',
      field: 'post_id',
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: '用户ID',
      field: 'user_id',
    },
    parentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: '父级评论ID',
      field: 'parent_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      // defaultValue: 'pending',
      defaultValue: 'approved',
      comment: '评论状态',
    },
    isAuthor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否作者',
      field: 'is_author',
    },
    userDevice: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '用户设备',
      field: 'user_device',
    },
    userRegion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '用户IP',
      field: 'user_region',
    },
    userBrowser: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '用户浏览器UA',
      field: 'user_browser',
    },
    userIp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '用户IP',
      field: 'user_ip',
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
  },
  {
    sequelize,
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['post_id'] },
      { fields: ['user_id'] },
      { fields: ['parent_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['post_id', 'status'] },
      { fields: ['user_id', 'created_at'] },
    ],
    hooks: {
      beforeValidate: async (comment: Comment) => {
        // 自动检查是否是作者回复
        if (!comment.isAuthor && comment.postId && comment.userId) {
          try {
            const post = await Article.findByPk(comment.postId);
            if (post && comment.userId === post.authorId) {
              comment.isAuthor = true;
            }
          } catch (error) {
            console.error(`[Comment Hook] 标记作者回复失败：post_id=${comment.postId}, user_id=${comment.userId}`, error);
          }
        }
      },
      beforeCreate: (comment: Comment) => {
        // XSS过滤，清理内容中的恶意代码
        if (comment.content) {
          comment.content = comment.content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/on\w+=\w+/gi, '');
        }
      },
    }
  }
)
