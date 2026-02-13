import { createShortIdCodec } from '@/utils/shortId.codec';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/models';
import { ArticleCategory, ArticleTag, Article, Category, Tag, User } from '@/models';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { getMeiliIndex } from '@/libs/meilisearch';
import { config } from '@/config/index';
import { ArticleAttributes } from '@/models/Article.model';
import { ImageService } from './Image.service';
import { ArticleListParams } from '@/schemas/admin/article.schema';
import { buildListQuery } from '@/utils/query.util';
import { Pagination } from '@/types/app';


/** ---------- 类型定义 ---------- */
/** admin 端 列表字段类型 */
export interface ArticleListItem {
  /** 文章 ID */
  id: number;
  /** 文章短 ID */
  shortId: string;
  /** 作者 */
  author: string;
  /** 文章标题 */
  title: string;
  /** 封面缩略图，假如有缩略图就返回缩略图，没有就返回原图 */
  thumbCover: string | null;
  /** 当前文章状态 */
  status: 'draft' | 'published';
  /** 优先级 */
  priority: number | null;
  /** 是否允许评论 */
  allowComment: boolean;
  /** 创建时间 */
  createdAt: Date;
}
/** 文章数据类型 */
export interface ArticlePayload {
  /** 文章作者ID */
  authorId: number;
  /** 文章标题 */
  title: string;
  /** 描述 */
  description: string | null;
  /** 文章状态 */
  status: 'draft' | 'published';
  /** 文章分类ID */
  categories: number[] | null;
  /** 文章标签ID列表 */
  tags: number[] | null;
  /** 文章内容 */
  content: string;
  /** 文章优先级 */
  priority?: number;
  /** 封面图片 */
  coverPath: string | null;
  /** 文章内插入图片的图片地址列表，JSON数组 */
  imagePaths: string[] | null;
  /** 是否允许评论 */
  allowComment: boolean;
}
/** 创建文章参数类型 */
interface ArticleWithAssociations extends Article {
  categories?: Category[];
  tags?: Tag[];
  author?: User;
}
/** 创建文章返回类型 */
export interface ArticleSearchResult {
  list: (ArticleWithAssociations & { matchReason?: string[] })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source?: 'meilisearch' | 'database' | 'meilisearch_error';
}
/** 有 author 字段的 Article 类型 */
export interface ArticleWithAuthor extends ArticleAttributes {
  author?: User;
}




/** ---------- 主服务类 ---------- */
/** 
 * 文章服务类
 * @description 提供文章相关的服务，包括获取最新文章、创建文章等
 * @description 创建文章时，会自动创建文章分类和标签关联关系，以及更新文章的shortId
 */
export class ArticleService { 

  /** 
   * 验证文章ID是否存在
   * @param rawId 文章ID(shortId 或者 普通ID)
   * @returns { Promise<void> }
   * @throws { NotFoundError } - 如果文章不存在
   */
  public static async verifyArticleId(rawId: number | string): Promise<void> {
    let articleId: number;

    if (typeof rawId !== 'number') {
      const { decode } = createShortIdCodec(config.salt.article);
      // 将文章 ID 由短ID转为数字ID
      const decoded = decode(rawId);
      if (decoded === null) throw new BadRequestError('短ID无效');
      articleId = decoded;
    } else {
      articleId = rawId;
    }

    const article = await Article.findOne({
      where: {
        id: articleId
      }
    });
    
    if (!article) throw new NotFoundError('文章不存在');
  }
  
  /** 
   * 获取最新文章发布文章
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 最新文章列表
   */
  public static async getLatestArticles(page: number = 1, pageSize: number = 5) {
    const offset = (page - 1) * pageSize;
    const articles = await Article.findAll({
      where: { status: 'published' },
      attributes: {
        exclude: [
          'id',
          'description',
          'content',
          'authorId',
          'status',
          'imagePaths',
          'updatedAt',
        ]
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
    });

    return {
      list: articles.map((article) => article.get({plain: true}))
    }
  }

  /** 
   * 创建文章（草稿/发布共用）
   * @param payload 文章数据
   * @param transaction 事务
   * @returns 创建的文章
   */
  public static async createArticle(
    payload: ArticlePayload,
    transaction?: Transaction
  ): Promise<ArticleListItem> { 
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 解析分类和标签（获取ID）
      const {
        authorId,
        title,
        description,
        status,
        categories,
        tags,
        content,
        priority,
        coverPath,
        imagePaths,
        allowComment,
      } = payload;

      // 创建文章
      const article = await Article.create({
        authorId,
        title,
        description,
        status,
        content,
        coverPath,
        imagePaths,
        priority: priority || 0,
        allowComment,
      }, {
        transaction: useTransaction,
      });

      if (!article) {
        throw new BadRequestError('文章创建失败');
      }

      // 更新文章的shortId
      const { encode } = createShortIdCodec(config.salt.article);
      const shortId = encode(article.id);
      await article.update({ shortId }, {
        transaction: useTransaction,
      });

      // 创建文章分类关联关系
      if (categories && categories.length > 0) {
        await ArticleCategory.bulkCreateWithCount(
          { postId: article.id, categoryIds: categories },
          { transaction: useTransaction }
        );
      }
      // 创建文章标签关联关系
      if (tags && tags.length > 0) {
        await ArticleTag.bulkCreateWithCount(
          { postId: article.id, tagIds: tags },
          { transaction: useTransaction }
        );
      }

      // 创建图片关联关系
      if (coverPath) {
        try {
          const { size, type } = await ImageService.getImageMetadata(coverPath);
          
          await ImageService.createImageRecord(
            {
              path: coverPath,
              size,
              type,
              storage: 'local',
              uploadedAt: new Date(),
              postId: article.id,
              userId: authorId
            },
            useTransaction
          );
        } catch (error) {
          console.warn(`[ArticleService] 无法获取封面图片信息，跳过关联: ${coverPath}`, error);
        }
      }
      if (imagePaths && imagePaths.length > 0) {
        const imageRecords = await ImageService.collectLocalImageRecords({
          imagePaths,
          postId: article.id,
          userId: authorId
        });
        if (imageRecords.length > 0) {
          await ImageService.createImageRecords(
            imageRecords,
            useTransaction
          );
        }
      }

      // 同步到 MeiliSearch（仅已发布文章）
      if (article.status === 'published') {
        const index = await getMeiliIndex('articles');
        
        // 获取关联数据
        const [categoryList, tagList] = await Promise.all([
          categories && categories.length > 0
            ? Category.findAll({ where: { id: categories }, attributes: ['id', 'name'], transaction: useTransaction })
            : [],
          tags && tags.length > 0
            ? Tag.findAll({ where: { id: tags }, attributes: ['id', 'name'], transaction: useTransaction })
            : [],
        ]);

        await index.addDocuments([{
          id: article.id,
          shortId: article.shortId,
          title: article.title,
          description: article.description,
          status: article.status,
          content: article.content,
          coverPath: article.coverPath,
          imagePaths: article.imagePaths,
          categories: categoryList,
          tags: tagList,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          allowComment: article.allowComment,
        }]);
      }

      const author = await User.findOne({
        where: { id: authorId },
        attributes: ['nickname'],
        transaction: useTransaction,
      });

      if(!author) throw new NotFoundError('作者不存在');

      // 提交事务
      if (!transaction) {
        await useTransaction.commit();
      }

      // 返回完整的文章详情（包含关联数据）
      return {
        id: article.id,
        shortId: article.shortId,
        title: article.title,
        status: article.status,
        priority: Number(article.priority),
        /** 假如有缩略图就返回缩略图，没有就返回原图 */
        thumbCover: article.coverPath ?
          await ImageService.getThumbUrl(article.coverPath) :
          article.coverPath ? await ImageService.getOriginUrl(article.coverPath) : null,
        author: author?.nickname ?? '未知作者',
        allowComment: Boolean(article.allowComment),
        createdAt: article.createdAt,
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      
      // 抛出错误，统一到 Controller 层处理错误
      throw error;
    }
  }

  /** 
   * 获取管理后台的文章的基本信息
   * @param {string | number} rawId 文章ID
   * @returns 文章基本信息
   */
  public static async getArticleBaseInfo(rawId: string | number): Promise<ArticleListItem> { 
    const postId = typeof rawId === 'number' ? rawId : Article.decodeShortId(rawId);
    if (postId === null) throw new BadRequestError('短ID无效');

    console.log('postId:', postId)

    const article = await Article.findOne({
      where: { id: postId },
      attributes: {
        exclude: [
          'id',
          'shortId',
          'title',
          'status',
          'priority',
          'coverPath',
          'createdAt',
        ]
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['nickname'],
        }
      ]
    })  as ArticleWithAuthor

    if (!article) throw new NotFoundError('文章不存在');

    return {
      id: article.id,
      shortId: article.shortId,
      title: article.title,
      status: article.status,
      priority: Number(article.priority),
      /** 假如有缩略图就返回缩略图，没有就返回原图 */
      thumbCover: article.coverPath ?
        await ImageService.getThumbUrl(article.coverPath) :
        article.coverPath ? await ImageService.getOriginUrl(article.coverPath) : null,
      author: article.author?.nickname ?? '未知作者',
      allowComment: Boolean(article.allowComment),
      createdAt: article.createdAt,
    }
  }

  /** 
   * 获取管理后台的文章列表
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 文章列表
   */
  public static async listForManagement(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ list: ArticleListItem[] }> {
    const offset = (page - 1) * pageSize;

    const articles = await Article.findAll({
      attributes: {
        exclude: [
          'id',
          'shortId',
          'title',
          'status',
          'priority',
          'coverPath',
          'createdAt',
        ]
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['nickname']
        },
      ],
    });

    return {
      list: await Promise.all(articles.map(async (article) => {
        const plain = article.get({ plain: true }) as ArticleWithAuthor;
        return {
          id: plain.id,
          shortId: plain.shortId,
          author: plain.author?.nickname ?? '未知作者',
          title: plain.title,
          /** 假如有缩略图就返回缩略图，没有就返回原图 */
          thumbCover: plain.coverPath ?
            await ImageService.getThumbUrl(plain.coverPath) :
            plain.coverPath ? await ImageService.getOriginUrl(plain.coverPath) : null,
          status: plain.status,
          priority: Number(plain.priority) ?? null,
          allowComment: Boolean(plain.allowComment),
          createdAt: plain.createdAt,
        };
      })),
    }
  }

  /** 
   * 获取文章详情
   * @param {string | number} rawId 文章ID(shortId 或者 普通ID)
   * @returns 文章详情
   * @throws {NotFoundError} 文章不存在
   * @throws {BadRequestError} 短ID无效
   */
  public static async getArticleDetail(rawId: string | number) {
    /** 文章 ID */
    let articleId: number;

    // 标准化文章ID
    if (typeof rawId !== 'number') {
      const { decode } = createShortIdCodec(config.salt.article);
      // 将文章 ID 由短ID转为数字ID
      const decoded = decode(rawId);
      if (decoded === null) throw new BadRequestError('短ID无效');
      articleId = decoded;
    } else {
      articleId = rawId;
    }

    const article = await Article.findOne({
      where: {
        id: articleId
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'email']
        },
        {
          model: Category,
          as: 'categories',
          attributes: ['id', 'name', 'alias'],
          through: { attributes: [] }
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'alias'],
          through: { attributes: [] }
        }
      ]
    });

    if (!article) {
      throw new NotFoundError('文章不存在');
    }

    return article;
  }

  /** 
   * 获取文章列表
   * @returns 文章列表
   */
  public static async getArticleList(query: Partial<ArticleListParams> = {}): Promise<{
    list: ArticleListItem[];
    pagination: Pagination;
  }> {
    // 1. 构建通用查询条件
    const { where, order, offset, limit, page, pageSize } = buildListQuery(query, {
      searchFields: ['title', 'description'],
      exactFields: ['id', 'status'],
    });

    // 2. 执行查询
    const { count, rows } = await Article.findAndCountAll({
      where,
      attributes: {
        exclude: [
          'description',
          'content',
          'authorId',
          'imagePaths',
          'updatedAt',
        ]
      },
      order: order as any,
      offset,
      limit,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['nickname']
        },
      ],
    });

    // 3. 格式化返回数据
    const list = await Promise.all(rows.map(async (article) => {
      const plain = article.get({ plain: true }) as ArticleWithAuthor;
      
      // 获取封面缩略图
      let thumbCover: string | null = null;
      if (plain.coverPath) {
        thumbCover = await ImageService.getThumbUrl(plain.coverPath);
      }

      return {
        id: plain.id,
        shortId: plain.shortId,
        author: plain.author?.nickname ?? '未知作者',
        title: plain.title,
        thumbCover,
        status: plain.status,
        priority: plain.priority ? Number(plain.priority) : null,
        allowComment: Boolean(plain.allowComment),
        createdAt: plain.createdAt,
      };
    }));

    return {
      list,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }
    };
  }
}