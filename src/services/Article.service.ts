import { createShortIdCodec } from '@/utils/shortId.codec';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/models';
import { PostCategory, PostTag, Post as ArticleModel, Category, Tag, User } from '@/models';
import { BadRequestError } from '@/utils/errors';
import { getMeiliIndex } from '@/libs/meilisearch';
import { config } from '@/config/index';


/** ---------- 类型定义 ---------- */
/** 文章数据类型 */
export interface ArticlePayload {
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
  cover_path: string | null;
  /** 文章内插入图片的图片地址列表，JSON数组 */
  image_paths: string[] | null;
}
/** 创建文章参数类型 */
interface ArticleWithAssociations extends ArticleModel {
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


/** ---------- 主服务类 ---------- */
/** 
 * 文章服务类
 * @description 提供文章相关的服务，包括获取最新文章、创建文章等
 * @description 创建文章时，会自动创建文章分类和标签关联关系，以及更新文章的shortId
 */
export class ArticleService { 
  /** 
   * 获取最新文章发布文章
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 最新文章列表
   */
  public static async getLatestArticles(page: number = 1, pageSize: number = 5) {
    const offset = (page - 1) * pageSize;
    const articles = await ArticleModel.findAll({
      where: { status: 'published' },
      attributes: {
        exclude: [
          'id',
          'description',
          'content',
          'author_id',
          'status',
          'image_paths',
          'updated_at',
        ]
      },
      order: [['created_at', 'DESC']],
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
  ) { 
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 解析分类和标签（获取ID）
      const {
        title,
        description,
        status,
        categories,
        tags,
        content,
        priority,
        cover_path,
        image_paths,
      } = payload;

      // 创建文章
      const article = await ArticleModel.create({
        title,
        description,
        status,
        content,
        cover_path,
        image_paths,
        priority: priority || 0,
      }, {
        transaction: useTransaction,
      });

      if (!article) {
        throw new BadRequestError('文章创建失败');
      }

      // 更新文章的shortId
      const { encode } = createShortIdCodec(config.salt.article);
      const shortId = encode(article.id);
      await article.update({ short_id: shortId }, {
        transaction: useTransaction,
      });

      // 创建文章分类关联关系
      if (categories && categories.length > 0) {
        await PostCategory.bulkCreateWithCount(
          { post_id: article.id, category_ids: categories },
          { transaction: useTransaction }
        );
      }

      // 创建文章标签关联关系
      if (tags && tags.length > 0) {
        await PostTag.bulkCreateWithCount(
          { post_id: article.id, tag_ids: tags },
          { transaction: useTransaction }
        );
      }

      // 提交事务
      if (!transaction) {
        await useTransaction.commit();
      }

      // 同步到 MeiliSearch（仅已发布文章）
      if (article.status === 'published') {
        try {
          const index = await getMeiliIndex('articles');
          
          // 获取关联数据
          const [categoryList, tagList] = await Promise.all([
            categories && categories.length > 0
              ? Category.findAll({ where: { id: categories }, attributes: ['id', 'name'] })
              : [],
            tags && tags.length > 0
              ? Tag.findAll({ where: { id: tags }, attributes: ['id', 'name'] })
              : [],
          ]);

          await index.addDocuments([{
            id: article.id,
            title: article.title,
            description: article.description,
            status: article.status,
            content: article.content,
            cover_path: article.cover_path,
            image_paths: article.image_paths,
            categories: categoryList,
            tags: tagList,
            created_at: article.created_at,
            updated_at: article.updated_at,
          }]);
        } catch (error) {
          console.error('MeiliSearch 索引添加失败:', error);
        }
      }
      
      return article;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }
}