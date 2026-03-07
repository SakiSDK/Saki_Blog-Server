import { resolveId } from '@/utils/id.util';
import { createShortIdCodec } from '@/utils/shortId.codec';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/models';
import { ArticleCategory, ArticleTag, Article, Category, Tag, User } from '@/models';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { getMeiliIndex } from '@/libs/meilisearch';
import { config } from '@/config/index';
import { ArticleAttributes } from '@/models/Article.model';
import { ImageService } from './Image.service';
import { ArticleListQuery, ArticleSearchQuery } from '@/schemas/article/article.admin';
import { buildListQuery } from '@/utils/query.util';
import { Pagination } from '@/types/app';
import { ArticleRecentVo, type ArticleBriefVo, type ArticleListQueryVo } from '@/schemas/article/article.web';


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

export interface ArticleDetail extends ArticleAttributes {
  author?: User;
  tags?: Tag[];
  categories?: Category[];
}

/** 含有 tags 和 categories 的 Article 类型 */
export interface ArticleWithTagsAndCategories extends ArticleAttributes {
  tags?: Tag[];
  categories?: Category[];
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
    const articleId = resolveId(rawId, config.salt.article);


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
  public static async getLatestArticles(page: number = 1, pageSize: number = 5): Promise<{
    list: ArticleRecentVo[]
  }> {
    const offset = (page - 1) * pageSize;
    const articles = await Article.findAll({
      where: { status: 'published' },
      attributes: {
        include: [
          'shortId',
          'coverPath',
          'createdAt',
          'title',
        ]
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
    });

    const list = await Promise.all(
      articles.map(async (article) => {
        const plain = article.get({ plain: true }) as ArticleAttributes;
        const thumbCover = plain.coverPath
          ? await ImageService.getThumbUrl(plain.coverPath)
          : null;
        console.log(thumbCover)
        return {
          shortId: plain.shortId!,
          title: plain.title,
          thumbCover,
          createdAt: plain.createdAt,
        };
      })
    ) as ArticleRecentVo[];

    console.log(list);

    return {
      list,
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
          const { size, type, width, height } = await ImageService.getImageMetadata(coverPath);
          
          await ImageService.createImageRecord(
            {
              path: coverPath,
              size,
              width,
              height,
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
    const articleId = resolveId(rawId, config.salt.article);

    const article = await Article.findOne({
      where: {
        id: articleId,
      },
      attributes: [
        'id',
        'shortId',
        'title',
        'description',
        'content',
        'priority',
        'authorId',
        'status',
        'coverPath',
        'coverThumbPath',
        'imagePaths',
        'createdAt',
        'updatedAt',
        'allowComment',
      ],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'nickname', 'avatar']
        },
        {
          model: Category,
          as: 'categories',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        }
      ]
    });

    if (!article) {
      throw new NotFoundError('文章不存在');
    }

    const plain = article.get({ plain: true }) as ArticleDetail;
    /** 文章缩略图封面 URL */
    // 获取封面缩略图
    let thumbCover: string | null = null;
    if (plain.coverPath) {
      thumbCover = await ImageService.getThumbUrl(plain.coverPath);
    }
    // 原始封面URL
    const originUrl = plain.coverPath ? ImageService.getOriginUrl(plain.coverPath) : null;
    
    return {
      id: plain.id,
      shortId: plain.shortId,
      author: plain.author ? {
        id: plain.author.id,
        nickname: plain.author.nickname,
        avatar: plain.author.avatar,
      } : {
        id: 0,
        nickname: '未知作者',
        avatar: null,
      },
      title: plain.title,
      thumbCover: thumbCover ?? originUrl,
      cover: originUrl, 
      status: plain.status,
      priority: plain.priority,
      allowComment: plain.allowComment,
      tags: plain.tags,
      categories: plain.categories,
      description: plain.description,
      content: plain.content,
      createdAt: plain.createdAt,
    };
  }

  /** 
   * 获取用于 web 端的文章列表
   * @param query 查询参数
   * @returns 文章列表
   */
  public static async getArticleListForWeb(query: Partial<ArticleListQueryVo> = {}): Promise<{
    list: ArticleBriefVo[];
    pagination: Pagination;
  }> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 6;
    const offset = (page - 1) * pageSize;
    
    const {count, rows} = await Article.findAndCountAll({
      where: {
        status: 'published',
      },
      distinct: true,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      include: [
        {
          model: Category,
          as: 'categories',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] }
        },
      ]
    });

    const list = await Promise.all(rows.map(async (article) => {
      const plain = article.get({ plain: true }) as ArticleWithTagsAndCategories;
      const cover = plain.coverPath ? await ImageService.getThumbUrl(plain.coverPath) : null;
      return {
        cover,
        shortId: plain.shortId,
        title: plain.title,
        priority: Number(plain.priority) ?? null,
        createdAt: plain.createdAt,
        tags: plain.tags || [],
        categories: plain.categories || [],
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

  /** 
   * 获取文章列表
   * @returns 文章列表
   */
  public static async getArticleList(query: Partial<ArticleListQuery> = {}): Promise<{
    list: ArticleListItem[];
    pagination: Pagination;
  }> {
    // 1. 构建通用查询条件
    // 列表接口仅做基础筛选，id/status/keyword 的精确或全文搜索由独立搜索接口处理
    const { where, order, offset, limit, page, pageSize } = buildListQuery(query, {
      searchFields: ['title', 'description'],
      exactFields: [],
    });

    // 2. 执行查询
    const { count, rows } = await Article.findAndCountAll({
      where,
      attributes: [
        'id',
        'shortId',
        'title',
        'coverPath',
        'status',
        'priority',
        'allowComment',
        'createdAt',
      ],
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
      // 原始图片
      const originUrl = plain.coverPath ? ImageService.getOriginUrl(plain.coverPath) : null;

      return {
        id: plain.id,
        shortId: plain.shortId,
        author: plain.author?.nickname ?? '未知作者',
        title: plain.title,
        thumbCover: thumbCover ?? originUrl,
        status: plain.status,
        priority: Number(plain.priority),
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

  /**
   * 删除文章及其对应关联关系，以及 meilisearch 的 index 关联 
   *  @param articleId 文章ID
   *  @throws {NotFoundError} 文章不存在
   */
  public static async deleteArticleWithRelations(rawId: number | string) {
    /** 文章 ID */
    const articleId = resolveId(rawId, config.salt.article);

    /*
    * 检查文章是否存在 */
    await this.verifyArticleId(articleId);

    /** 事务 */
    const transaction = await sequelize.transaction();
    try {
      /** 删除文章的标签和分类字段对应关系 */
      await Article.deleteWithRelations(articleId, { transaction });
      
      /** 删除文章和图片的关联关系 */
      await ImageService.deleteWithRelations(articleId, { transaction });
      
      /** 删除 meilisearch 的 index 关联 */
      // 注意：Meilisearch 操作不参与数据库事务，但放在此处若失败可回滚数据库操作
      const index = await getMeiliIndex('articles');
      await index.deleteDocument(articleId.toString());

      // 提交事务
      await transaction.commit();
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 搜索文章 
   * @param query 搜索参数
   * @returns 文章列表
   */
  public static async searchArticles(query: Partial<ArticleSearchQuery>) {
    const { 
      keyword, 
      author, 
      status, 
      createdFrom, 
      createdTo, 
      page = 1, 
      pageSize = 10 
    } = query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    // 关键词使用Meilisearch搜索
    let matchedIds: number[] | null = null;
    if (keyword?.trim()) {
      try {
        const index = await getMeiliIndex('articles');
        const searchResult = await index.search(keyword, {
          limit: 1000, // 获取足够多的候选 ID
          attributesToRetrieve: ['id'],
          attributesToSearchOn: ['title', 'description', 'content'], // 只搜索标题、简介、内容
        });
        matchedIds = searchResult.hits.map((hit) => hit.id);
        
        // 如果有关键词但没搜到，直接返回空
        if (matchedIds.length === 0) {
          return {
            list: [],
            pagination: {
              page: Number(page),
              pageSize: Number(pageSize),
              total: 0,
              totalPages: 0,
            }
          };
        }
      } catch (error) {
        console.error('[ArticleService] Meilisearch search failed:', error);
        // 如果 Meilisearch 挂了，这里可以选择降级或者抛出错误
        // 鉴于用户要求 keyword 走 meilisearch，这里如果失败最好抛出异常让前端知道
        throw error;
      }
    }

    console.log('matchedIds: ', matchedIds);

    // 构建通用查询条件
    const where: any = {};
    
    // 应用 Meilisearch 搜索结果的 ID 过滤
    if (matchedIds !== null) {
      where.id = { [Op.in]: matchedIds };
    } else if (keyword?.trim()) {
      // 如果有 keyword 但是 Meilisearch 返回空，理论上上面已经 return 了
      // 这里是兜底，防止逻辑漏洞
      where.id = { [Op.in]: [] };
    }

    // 应用状态过滤
    if (status) {
      where.status = status;
    }

    // 应用日期范围过滤
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt[Op.gte] = new Date(createdFrom);
      if (createdTo) where.createdAt[Op.lte] = new Date(createdTo);
    }

    // 应用作者过滤
    const authorInclude: any = {
      model: User,
      as: 'author',
      attributes: ['nickname'],
    };

    if (author?.trim()) {
      authorInclude.where = {
        nickname: { [Op.like]: `%${author.trim()}%` }
      };
    }

    // 执行数据库查询
    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        authorInclude,
      ],
      attributes: [
        'id',
        'shortId',
        'title',
        'coverPath',
        'status',
        'priority',
        'allowComment',
        'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    // 格式化返回数据（与 getArticleList 保持一致）
    const list = await Promise.all(rows.map(async (article) => {
      const plain = article.get({ plain: true }) as ArticleWithAuthor;
      
      // 获取封面缩略图
      let thumbCover: string | null = null;
      if (plain.coverPath) {
        thumbCover = await ImageService.getThumbUrl(plain.coverPath);
      }
      // 原始图片
      const originUrl = plain.coverPath ? ImageService.getOriginUrl(plain.coverPath) : null;

      return {
        id: plain.id,
        shortId: plain.shortId,
        author: plain.author?.nickname ?? '未知作者',
        title: plain.title,
        thumbCover: thumbCover ?? originUrl,
        status: plain.status,
        priority: Number(plain.priority),
        allowComment: Boolean(plain.allowComment),
        createdAt: plain.createdAt,
      };
    }));

    return {
      list,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: count,
        totalPages: Math.ceil(count / Number(pageSize)),
      }
    };
  }

}