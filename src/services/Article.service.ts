// // src/services/postService.ts
// import { Op, Transaction } from 'sequelize';
// import { sequelize } from '../models/sequelize';
// import { PostCategory, PostTag, Post, Category, Tag, User } from '../models/index';
// import { BadRequestError } from '../utils/errors';
// import { deleteLocalFile, readLocalFile } from '../utils/file';
// import path from 'path';
// import { ShortIdUtil } from "../utils/shortIdUtil";
// import { postIndex } from '../utils/meilisearch';



// // 文章基础信息
// export interface PostData {
//     title: string;
//     description?: string | null;
//     status: 'draft' | 'published';
//     categories?: number[]; // 分类ID数组
//     tags?: number[]; // 标签ID数组
//     post_path: string;
//     cover_path?: string | null;
//     image_paths?: string[] | null;
// }

// interface PostWithMatchReason extends Post {
//   matchReason: string[]; // 存储匹配原因，如 ["标题匹配", "标签匹配"]
// }

// interface PostWithAssociations extends Post {
//     categories?: Category[];
//     tags?: Tag[];
// }


// /**
//  * 高亮匹配关键字
//  */
// const highlightKeywords = (text: string, keyword: string) => {
//     if (!text || !keyword) return text;
//     const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
//     const regex = new RegExp(`(${escapedKeyword})`, 'gi');
//     return text.replace(regex, (match) => `<span class="highlight">${match}</span>`);
// }

// export class PostService {
//     public static async getRecentPosts({
//         page = 1,
//         limit = 5,
//     }) {
//         const offset = (page - 1) * limit;
//         const posts = await Post.findAll({
//             where: {
//                 status: 'published',
//             },
//             attributes: {
//                 exclude: ['id', 'description', 'image_urls', 'post_path', 'author_id', 'status', 'updated_at'],
//             },
//             order: [['created_at', 'DESC']],
//             limit,
//             offset,
//         });
//         const plainPosts = posts.map(post => post.get({ plain: true }));
//         return {
//             posts: plainPosts
//         };
//     }

//     public static async getPostDetail(id: number) { 
//         const post = await Post.findByPk(id, {
//             attributes: {
//                 exclude: ['id','status','author_id']
//             },
//             include: [
//                 {
//                     model: Category,
//                     as: 'categories',
//                     attributes: ['id', 'name'],
//                     through: { attributes: [], },
//                     required: false,
//                 },
//                 {
//                     model: Tag,
//                     as: 'tags',
//                     attributes: ['id', 'name'],
//                     through: { attributes: [], },
//                     required: false,
//                 },
//                 {
//                     model: User,
//                     as: 'author',
//                     attributes: ['nickname', 'avatar', 'short_id'],
//                     required: false,
//                 }
//             ]
//         });
//         if (!post) throw new BadRequestError('文章未找到');
//         const plainPost = post.get({ plain: true });
//         return plainPost;
//     }

//     public static async getWebPostList(query: {
//         page?: number;
//         limit?: number;
//     }) {
//         const { page = 1, limit = 10 } = query;
//         const offset = (page - 1) * limit;
//         const { count, rows } = await Post.findAndCountAll({
//             where: {
//                 status: 'published',
//             },
//             attributes: {
//                 exclude: ['id', 'description', 'image_urls', 'author_id', 'post_path', 'status', 'updated_at'],
//             },
//             include: [
//                 {
//                     model: Category,
//                     as: 'categories',
//                     attributes: ['id', 'name'],
//                     through: { attributes: [], },
//                     required: false,
//                 },
//                 {
//                     model: Tag,
//                     as: 'tags',
//                     attributes: ['id', 'name'],
//                     through: { attributes: [], },
//                     required: false,
//                 },
//             ],
//             order: [['created_at', 'DESC']],
//             limit,
//             offset,
//             distinct: true,
//         });
//         const plainPosts = rows.map(post => {
//             const plainPost = post.get({ plain: true });
//             return plainPost;
//         })

//         return {
//             list: plainPosts,
//             total: count,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(count / limit),
//         };
//     }

//     public static async getPostList(query: {
//         title?: string;
//         description?: string;
//         status?: 'draft' | 'published';
//         tags?: number[];
//         categories?: number[];
//         page?: number;
//         limit?: number;
//         order_by?: 'created_at' | 'updated_at' | 'size' | 'width' | 'height';
//         sort?: 'ASC' | 'DESC';
//     }) {
//         const { title, description, status, categories, tags, page = 1, limit = 10, order_by = 'created_at', sort = 'DESC' } = query;
//         const offset = (page - 1) * limit;
//         const whereConditions: any = {};
//         if (title) {
//             whereConditions.title = {
//                 [Op.like]: `%${title}%`,
//             };
//         }
//         if (description) {
//             whereConditions.description = {
//                 [Op.like]: `%${description}%`,
//             };
//         }
//         if (status) {
//             whereConditions.status = status;
//         }

//         const include: any[] = [];
//         if (categories && categories.length > 0) {
//             include.push({
//                 model: Category,
//                 as: 'categories',
//                 attributes: ['id', 'name'],
//                 through: { attributes: [], },           // 忽略中间表字段
//                 where: { id: { [Op.in]: categories } }, // 筛选分类
//                 required: true,                         // 筛选分类
//             })
//         } else {
//             include.push({
//                 model: Category,
//                 as: 'categories',
//                 attributes: ['id', 'name'],
//                 through: { attributes: [], },           // 忽略中间表字段
//                 required: false,                        // 左连接
//             })
//         }
//         if (tags && tags.length > 0) {
//             include.push({
//                 model: Tag,
//                 as: 'tags',
//                 attributes: ['id', 'name'],
//                 through: { attributes: [], },           // 忽略中间表字段
//                 where: { id: { [Op.in]: tags } }, // 筛选分类
//                 required: true,                         // 筛选分类
//             })
//         } else {
//             include.push({
//                 model: Tag,
//                 as: 'tags',
//                 attributes: ['id', 'name'],
//                 through: { attributes: [], },           // 忽略中间表字段
//                 required: false,                        // 左连接
//             })
//         }
//         const { count, rows} = await Post.findAndCountAll({
//             where: whereConditions,
//             attributes: { exclude: ['author_id','status','updated_at'] },
//             include,
//             offset,
//             limit,
//             order: [[order_by, sort]],
//             distinct: true, // 去重
//         });
//         const plainPosts = rows.map(post => post.get({ plain: true }));
//         return {
//             posts: plainPosts,
//             total: count,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(count / limit),
//         }
//     }


//     /**
//     * 无关键词分页查询（普通模式）
//     * 获取正常状态的文章列表（支持分页）
//     * 功能：查询分页的文章数据，包含关联的分类和标签信息，并返回分页相关的元数据
//     * @param {number} page - 页码，默认为1（从1开始）
//     * @param {number} limit - 每页条数，默认为10
//     * @returns  - 包含文章列表和分页信息的对象
//     */
//     public static async getNormalPostList (page: number = 1, limit: number = 10){
//         const offset: number = (page - 1) * limit;
//         const { count, rows } = await Post.findAndCountAll({
//             include: [
//                 { model: Category, attributes: ['id', 'name'], as: 'categories' },
//                 { model: Tag, attributes: ['id', 'name'], as: 'tags' },
//             ],
//             limit,
//             offset,
//             order: [['created_at', 'DESC']],
//             distinct: true,
//         })

//         return {
//             list: rows.map(post => ({
//                 ...post.toJSON(),
//                 matchReason: ['无关键词搜索']
//             })),
//             total: count,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(count / limit),
//         }
//     }

    
//     public static async searchWithMeili(keyword: string, page: number = 1, limit: number = 10) {
//         const offset: number = (page - 1) * limit;
//         const result = await postIndex.search(keyword, {
//             limit,
//             offset,
//             attributesToHighlight: ['title', 'description', 'content'],
//         })

//         const posts = result.hits.map(hit => ({
//             ...hit,
//         }))

//         return {
//             list: posts,
//             total: result.estimatedTotalHits,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(result.estimatedTotalHits / limit),
//         }
//     }

//     public static async searchPostList(query: { keyword: string, page: number, limit: number }) {
//         const { keyword, page = 1, limit = 10 } = query;

//         // 无关键词普通分页
//         if (!keyword) {
//             return await this.getNormalPostList(page, limit);
//         }

//         // 关键词搜索使用MeiliSearch
//         try {
//             const meiliResult = await await this.searchWithMeili(keyword, page, limit);
//             return {
//                 list: meiliResult.list as PostWithMatchReason[],
//                 total: meiliResult.total,
//                 page,
//                 pageSize: meiliResult.pageSize,
//                 totalPages: meiliResult.totalPages,
//                 source: 'meilisearch',
//             };
//         } catch (error: any) {
//             console.error('MeiliSearch 搜索失败：', error.message);
//             return {
//                 list: [],
//                 total: 0,
//                 page,
//                 pageSize: limit,
//                 totalPages: 0,
//                 source: 'meilisearch_error',
//             }
//         }
//     }


//     public static async uploadDraftArticle(data: PostData) { 
//         const transaction: Transaction = await sequelize.transaction();
//         try {
//             const { title, description, status, categories, tags, post_path, cover_path, image_paths } = data;
//             const post = await Post.create({
//                 title,
//                 description,
//                 status,
//                 post_path: post_path,
//                 cover_path: cover_path || null,
//                 image_paths: image_paths || [],
//             } as any, {
//                 transaction,
//             })
//             if (!post) {
//                 throw new Error('文章创建失败');
//             }
//             if (categories && categories.length > 0) {
//                 await PostCategory.bulkCreateWithCount(
//                     { post_id: post.id, category_ids: categories },
//                     { transaction }
//                 );
//             }
//             if (tags && tags.length > 0) {
//                 await PostTag.bulkCreateWithCount(
//                     { post_id: post.id, tag_ids: tags },
//                     { transaction }
//                 );
//             }
//             // 提交事务
//             await transaction.commit();
//             return post;
//         } catch (error) {
//             await transaction.rollback();
//             throw error;
//         }
//     }
//     public static async uploadCompleteArticle(data: PostData) {
//         const transaction: Transaction = await sequelize.transaction();
//         try {
//             const { title, description, status, categories, tags, post_path, cover_path, image_paths } = data;

//             // 创建文章记录
//             const post = await Post.create({
//                 title,
//                 description,
//                 status,
//                 post_path: post_path,
//                 cover_path: cover_path || null,
//                 image_paths: image_paths || [],
//             } as any, {
//                 transaction,
//             })

//             // 如果创建失败，抛出错误
//             if (!post) {
//                 throw new Error('文章创建失败');
//             }

//             // 然后更新 short_id
//             const shortId = ShortIdUtil.encode(post.id);
//             await post.update({ short_id: shortId }, {
//                 transaction,
//             });

//             // 创建分类关系
//             if (categories && categories.length > 0) {
//                 await PostCategory.bulkCreateWithCount(
//                     { post_id: post.id, category_ids: categories },
//                     { transaction },
//                 );
//             }

//             // 创建标签关系
//             if (tags && tags.length > 0) {
//                 await PostTag.bulkCreateWithCount(
//                     { post_id: post.id, tag_ids: tags },
//                     { transaction }
//                 );
//             }

//             // 提交事务
//             await transaction.commit();

//             // 提交成功后写入Meilisearch索引
//             try {
//                 let content: string = ''
//                 if (post.post_path) {
//                     try {
//                         content = await readLocalFile(path.join('/public', post.post_path));
                        
//                         // 去除 Markdown 标记（可选）
//                         content = content.replace(/[#>*_`~\-!\[\]\(\)]/g, '').trim()
//                     } catch (error: any) {
//                         console.warn(`[MeiliSearch] 读取文章正文失败：${post.title}`, error.message)
//                     }
//                 }
                
//                 // 3. 查询完整分类和标签信息（用于索引）
//                 const [categoryList, tagList] = await Promise.all([
//                     categories && categories.length > 0
//                         ? Category.findAll({ where: { id: categories }, attributes: ['id', 'name'] })
//                         : [],
//                     tags && tags.length > 0
//                         ? Tag.findAll({ where: { id: tags }, attributes: ['id', 'name'] })
//                         : [],
//                 ]);

//                 await postIndex.addDocuments([{
//                     id: post.id,
//                     title: post.title,
//                     description: post.description,
//                     status: post.status,
//                     categories: categoryList,
//                     tags: tagList,
//                     post_path: post_path,
//                     cover_path: cover_path,
//                     image_paths: image_paths,
//                     content,
//                     created_at: post.created_at,
//                     updated_at: post.updated_at,
//                 }])
//                 console.log(`[MeiliSearch] 已索引文章：${post.title}`)
//             } catch (error) {
//                 console.log(`[MeiliSearch] 索引文章失败：${post.title}`)
//             }

//             return post;
//         } catch (error) {       
//             await transaction.rollback();
//             throw error;
//         }
//     }


//     // 删除文章及其关联关系
//     public static async deletePostWithAssociations(postId: number) {
//         const transaction: Transaction = await sequelize.transaction();
//         try {
//             const post = await Post.findByPk(postId, {
//                 transaction,
//             });
//             if (!post) {
//                 throw new BadRequestError('文章不存在或已被删除');
//             }
//             const cover_path = post.cover_path || null;
//             const image_paths = post.image_paths || [];

//             // 删除文章及其关联关系
//             const deletedPost = await Post.destroy({
//                 where: { id: postId },
//                 transaction,
//             });
//             if (!deletedPost) {
//                 throw new Error('文章不存在');
//             }

//             // 删除文章关联的分类关系，及其相关文章计数
//             await PostCategory.deleteByPostId(postId, {
//                 transaction
//             });

//             // 删除文章关联的标签关系，及其相关文章计数
//             await PostTag.deleteByPostId(postId, {
//                 transaction
//             });

//             // 提交事务
//             await transaction.commit();

//             // 删除meilisearch索引
//             try {
//                 await postIndex.deleteDocument(postId);
//                 console.log(`[MeiliSearch] 已删除索引：${postId}`)
//             } catch (error) {
//                 console.log(`[MeiliSearch] 删除索引失败：${postId}`);
//             }

//             // 提交事务后删除相关文件
//             await deleteLocalFile(cover_path);
//             image_paths.forEach(async (image_paths) => {
//                 await deleteLocalFile(image_paths);
//             });
//         }catch(error) {
//             await transaction.rollback();
//             throw error;
//         }
//     }
// }

import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/models';
import { PostCategory, PostTag, Post as ArticleModel, Category, Tag, User } from '@/models';
import { BadRequestError } from '@/utils/errors';
import { ShortIdUtil } from '@/utils/shortId.util';
import { getMeiliIndex } from '@/libs/meilisearch';


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
      }, {
        transaction: useTransaction,
      });

      if (!article) {
        throw new BadRequestError('文章创建失败');
      }

      // 更新文章的shortId
      const shortId = ShortIdUtil.encode(article.id);
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