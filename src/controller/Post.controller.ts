// // src/controllers/postController.ts
// import { Request, Response } from 'express';
// import { PostService } from '../services/Post.service'
// import { config } from '../config/index';
// import path from 'path';
// import { BadRequestError } from '../utils/errors';
// import { createLocalFile, deleteLocalFile } from '../utils/file';
// import camelcaseKeys from 'camelcase-keys';
// import { ShortIdUtil } from '../utils/shortIdUtil';
// import {
//     deletePostWithAssociationsSchema, getAdminPostListSchema, getPostDetailSchema,
//     getRecentPostsSchema, getWebPostListSchema, searchPostListSchema,
//     uploadCompleteArticleSchema, uploadDraftArticleSchema
// } from '../validators/post.schema';
// import { bulkUploadLocalToOSS, BulkUploadResult, uploadLocalToOSS, uploadToOSS } from '../utils/upload';



// /**
//  * 工具函数：解析请求体中的JSON字符串字段
//  * @param body - 请求体对象（req.body）
//  * @param fields - 需要解析的字段数组（如categories、tags，前端可能传JSON字符串）
//  * 作用：避免前端传JSON字符串时，后端接收为string类型导致的类型错误，解析失败时默认设为空数组
//  */
// const parseJsonFields = (body: any, fields: string[]) => {
//     fields.forEach(field => {
//         if (typeof body[field] === 'string') {
//             try {
//                 body[field] = JSON.parse(body[field]);
//             } catch (error) {
//                 body[field] = [];
//             }
//         }
//     })
// }

// /**
//  * 文章控制器类：封装所有文章相关的HTTP接口处理逻辑
//  * -----------------------------------------
//  *  - 搜索文章
//  *  - 获取文章列表
//  *  - 获取文章详情
//  *  - 上传文章
//  *  - 获取文章详情
//  */
// export class PostController {
//     /** 
//      * 替换文章内容中的旧临时URL为OSS为URL
//      */
//     private static async replaceTempUrlWithOssUrl(
//         content: string,
//         imageRes: BulkUploadResult[],
//         serverUrl: string ,
//         publicDir: string,
//     ): Promise<string> {
//         // 假如没有图片上传，直接返回原内容
//         if (!imageRes || imageRes.length === 0) return content;

//         // 构建「旧临时URL → 新OSS URL」映射表
//         const urlMap = new Map<string, string>();
        
//         // 处理publicDir末尾可能存在的斜杆，避免路径重复（比如 publicDir 是 /xxx/public/ 或 /xxx/public）
//         const normalizedPublicDir = publicDir.replace(/[\\/]$/, '')

//         imageRes.forEach((res) => {
//             if (!res.success || !res.localFilePath || !res.url) return;

//             // 生成旧临时URL（蹦迪临时文件路径->临时访问URL）
//             const tempRelativePath = res.localFilePath
//                 .replace(normalizedPublicDir, '') // 移除本地public目录绝对路径
//                 .replace(/\\/g, '/') // 兼容Windows路径分隔符
//                 .replace(/^\/+/, '/'); // 确保路径以单个/开头
            
//             const oldTempUrl = `${config.serverUrl}${tempRelativePath}`;
//             urlMap.set(oldTempUrl, res.url);

//             // 调试使用
//             console.log(`[URL替换映射] 旧临时URL：${oldTempUrl} → OSS URL：${res.url}`);
//         })

//         if (urlMap.size === 0) {
//             console.warn('[URL替换警告] 无有效映射关系，直接返回原内容');
//              // 无需要替换的URL，直接返回原内容
//             return content;
//         } 

//         // 正则表达式（解决 localhost 匹配、后缀兼容问题）
//         // 转义 serverUrl 中的特殊字符（比如 http://、.、:）
//         const escapedServerUrl = serverUrl
//             .replace(/https?:\/\//, 'https?:\\/\\/') // 转义 http:// 或 https://
//             .replace(/\./g, '\\.') // 转义 .
//             .replace(/:/g, '\\:'); // 转义 :
//         // 正则匹配规则：支持临时URL后缀（jpg/jpeg/png/gif/webp/svg/avif），排除空格和引导
//         const tempUrlRegex = new RegExp(
//             `${escapedServerUrl}\\/uploads\\/temp\\/[^\\s'"]+?\\.(jpg|jpeg|png|gif|webp|svg|avif)`,
//             'g'
//         );

//         // 执行全局替换
//         const replaceContent = content.replace(tempUrlRegex, (matchedOldUrl) => {
//             const newOssUrl = urlMap.get(matchedOldUrl);
//             if (!newOssUrl) {
//                 console.warn(`[URL替换警告] 未找到对应OSS URL，保留原URL：${matchedOldUrl}`);
//                 return matchedOldUrl;
//             }
//             console.log(`[URL替换映射] 旧临时URL：${matchedOldUrl} → OSS URL：${newOssUrl}`);
//             return newOssUrl;
//         })

//         // 替换完成后验证：是否还有未替换的临时URL
//         const remainingTempUrls = replaceContent.match(tempUrlRegex);
//         if (remainingTempUrls && remainingTempUrls.length > 0) {
//             console.warn(`[URL替换警告] 仍有 ${remainingTempUrls.length} 个临时URL未替换：`, remainingTempUrls);
//         }

//         return replaceContent;
//     }

//     public static async getRecentPosts(req: Request, res: Response) {
//         try {
//             // 参数校验
//             const { error, value } = getRecentPostsSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误', error.details);

//             // 调用服务层处理逻辑
//             const result = await PostService.getWebPostList({
//                 page: 1,
//                 limit: value.limit || 5
//             });

//             // 返回结果
//             const { list } = result;
//             res.status(200).json({
//                 message: '获取最近文章成功',
//                 data: list.map((post) => ({
//                     ...camelcaseKeys(post, { deep: true }),
//                     coverPath: post.cover_path ? `${config.oss.endpoint}/${post.cover_path}` : null,
//                 }))
//             })
//         }catch (error: any) {
//             console.error('[PostController.getRecentPosts]: 获取最近文章失败', error.message)
//             return res.status(error.status || 400).json({
//                 message: error.message || '获取最近文章失败',
//             })
//         }
//     }

//     /**
//      * 获取文章详情接口
//      * - 响应：返回文章详情（含封面/内图URL）
//      */
//     public static async getPostDetail(req: Request, res: Response) { 
//         try {
//             // 参数校验
//             const { error, value } = getPostDetailSchema.validate(req.params);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误', error.details);

//             // 调用服务层处理逻辑
//             const { shortId } = req.params;
//             const realId = ShortIdUtil.decode(shortId)[0];

//             if (!realId) {
//                 throw new BadRequestError('文章短链接ID无效');
//             }
//             const post = await PostService.getPostDetail(realId);

//             res.status(200).json({
//                 message: '文章详情获取成功',
//                 data: {
//                     ...camelcaseKeys(post, { deep: true }),
//                     coverPath: post.cover_path ? `${config.oss.endpoint}/${post.cover_path}` : null,
//                     imageUrls: post.image_paths ? post.image_paths.map(imagePath => `${config.oss.endpoint}/${imagePath}`) : null,
//                     postPath: post.post_path ? `${config.serverUrl}${post.post_path}` : null,
//                 },
//             })
//         } catch (error: any) {
//             console.error('[PostController.getPostDetail]: 请求参数有误或格式错误', error.message)
//             return res.status(error.status || 400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             })
//         }
//     }

//     /**
//      * 文章搜索接口
//      * - 功能：根据关键字搜索文章，支持分页
//      * - 请求方式：GET（参数通过req.query传递）
//      * - 响应：返回搜索到的文章列表（含封面/图片URL拼接）和分页信息
//      */
//     public static async searchPostList(req: Request, res: Response) {
//         try {
//             // 参数校验
//             const { error, value } = searchPostListSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误');

//             // 调用服务层处理搜索逻辑
//             const result = await PostService.searchPostList({
//                 ...value,
//             });

//             // 返回结果
//             res.status(200).json({
//                 message: '文章搜索成功',
//                 data: (result.list || []).map((post) => ({
//                     ...camelcaseKeys(post, { deep: true }),
//                     coverPath: post.cover_path ? `${config.oss.endpoint}/${post.cover_path}` : null,
//                     imageUrls: post.image_paths ? post.image_paths.map(imagePath => `${config.oss.endpoint}/${imagePath}`) : null,
//                     postPath: post.post_path ? `${config.serverUrl}${post.post_path}` : null,
//                 })) || [],
//                 pagination: {
//                     total: result.total,
//                     page: result.page,
//                     pageSize: result.pageSize,
//                     totalPages: result.totalPages,
//                 }
//             })

//         }catch (error: any) {
//             console.error('[PostController.searchPostList]: ', error.message)
//             return res.status(400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             })
//         }
//     }

//     /**
//      * Web端文章列表接口
//      * - 功能：给前端Web页面提供文章列表（无需筛选条件，仅分页）
//      * - 请求方式：GET（参数通过req.query传递）
//      * - 响应：返回简化的文章列表（含封面/内图URL）和分页信息
//      */
//     public static async getWebPostList(req: Request, res: Response) {
//         try {
//             const { error, value } = getWebPostListSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误', error.details);

//             const result = await PostService.getWebPostList({
//                 ...value,
//             });

//             res.status(200).json({
//                 message: '文章列表获取成功',
//                 data: (result.list || []).map((post) => {
//                     return {
//                         ...camelcaseKeys(post, { deep: true }),
//                         coverPath: post.cover_path ? `${config.oss.endpoint}/${post.cover_path}` : null,
//                     }
//                 }),
//                 pagination: {
//                     total: result.total,
//                     page: result.page,
//                     pageSize: result.pageSize,
//                     totalPages: result.totalPages,
//                 }
//             })
//         }catch (error: any) {
//             console.error('[PostController.getWebPostList]: 获取文章列表失败', error.message)
//             return res.status(400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             })
//         }
//     } 

//     /**
//      * 管理端文章列表接口
//      * - 功能：给后端管理系统提供文章列表，支持多条件筛选（标题、分类、标签、状态等）和排序
//      * - 请求方式：GET（参数通过req.query传递）
//      * - 响应：返回完整文章列表（蛇形转驼峰）和分页信息，适配管理端复杂筛选场景
//      */
//     public static async getAdminPostList(req: Request, res: Response) { 
//         try {
//             // 参数校验
//             const { error, value } = getAdminPostListSchema.validate(req.query);
//             if (error) throw new BadRequestError(error.message || '请求参数有误或格式错误', error.details);

//             // 获取文章列表
//             const result = await PostService.getPostList(value);
            
//             // 返回结果
//             res.status(200).json({
//                 message: '文章列表获取成功',
//                 data: camelcaseKeys(result.posts.map((post) => ({
//                     ...post,
//                     cover_path: post.cover_path ? `${config.oss.endpoint}${post.cover_path}` : null,
//                     image_urls: post.image_paths ? post.image_paths.map(imagePath => `${config.oss.endpoint}${imagePath}`) : null,
//                     post_path: post.post_path ? `${config.serverUrl}${post.post_path}` : null,
//                 })) || [], { deep: true }),
//                 pagination: {
//                     total: result.total,
//                     page: result.page,
//                     pageSize: result.pageSize,
//                     totalPages: result.totalPages,
//                 }
//             })
//         } catch (error: any) {
//             console.error('[PostController.getPostList]: 获取文章列表失败', error.message)
//             return res.status(400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             })
//         }
//     }

//     /**
//      * 文件上传接口（封面/内图/内容文件）
//      * - 功能：处理临时文件上传（用于文章编辑时的预览），支持多文件
//      * - 请求方式：POST（参数通过req.params.type区分文件类型，文件通过req.files/req.file传递）
//      * - 响应：返回文件预览URL（临时目录路径），供前端预览使用
//      */
//     public static async uploadFile(req: Request, res: Response) {
//         try {
//             const { type } = req.params; // type: cover/image/content
//             const files = req.files as Express.Multer.File[] || [req.file as Express.Multer.File];

//             if (!files || files.length === 0) throw new Error('未上传文件');
//             if (!['cover', 'images', 'content'].includes(type)) throw new Error('无效的文件类型');

//             // 处理文件路径：转为相对路径（存储到数据库）
//             const fileNames = files.map(file => {
//                 // 从完整路径中提取相对路径（如：temp/cover/xxx.png 或 covers/xxx.png）
//                 return file.filename;
//             });

//             // 返回文件访问URL
//             const fileUrls = fileNames.map(name => {
//                 return `${config.serverUrl}/uploads/temp/${type}/${name}`;
//             });

//             res.status(200).json({
//                 message: `${type === 'cover' ? '封面' : type === 'images' ? '内图' : '内容文件'}上传成功`,
//                 data: {
//                     fileUrls, // 前端预览用URL
//                 }
//             });
//         } catch (error: any) {
//             res.status(400).json({ message: error.message });
//         }
//     }

//     /**
//      * 临时图片删除接口
//      * - 功能：删除文章编辑时上传到临时目录的图片（如用户取消编辑）
//      * - 请求方式：POST（参数通过req.body.filenames传递，为文件名数组）
//      * - 响应：返回删除成功提示，内部调用文件工具删除本地文件
//      */
//     public static async deleteTempImages(req: Request, res: Response) {
//         try {
//             console.log("删除临时图片:", req.body.filenames)
//             const { filenames } = req.body; 
//             if (!filenames.length) {
//                 throw new BadRequestError('请传入文件名');
//             }
//             (filenames as string[]).forEach(filename => {
//                 const filePath = path.join('/uploads/temp/images', filename);
//                 deleteLocalFile(filePath);
//             });
//             res.status(200).json({
//                 message: '图片删除成功',
//             })
//         } catch (error: any) {
//             res.status(400).json({
//                 message: error.message || '临时图片删除失败',
//             })
//         }
//     }


//     /**
//      * 上传草稿文章接口
//      * - 功能：保存文章草稿（状态为draft），支持临时封面和内图URL
//      * - 请求方式：POST（参数通过req.body传递，封面文件通过req.files传递）
//      * - 响应：返回草稿文章信息（含临时封面/内图URL），供后续编辑使用
//      */
//     public static async uploadDraftArticle(req: Request, res: Response) {
//         try {
//             // 参数处理
//             parseJsonFields(req.body, ['categories', 'tags', 'image_urls']);

//             // 参数校验
//             const { error, value } = uploadDraftArticleSchema.validate(req.body);
//             if (error) throw new BadRequestError(error.message);

//             // 封面文件处理
//             const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//             const cover_path = Array.isArray(files) ? files.cover[0] : null 

//             // 调用服务层处理
//             const post = await PostService.uploadDraftArticle({
//                 ...value,
//                 cover_path: cover_path ? cover_path.filename : null,
//             });
//             if (!post) throw new BadRequestError('临时文章上传失败');
            
//             // 返回结果
//             res.status(201).json({
//                 message: '临时文章上传成功',
//                 data: {
//                     ...camelcaseKeys(
//                         post.get({ plain: true }), 
//                         {deep: true,}
//                     ),
//                     cover_path: cover_path ? `${config.oss.endpoint}/${cover_path}` : null,
//                     image_urls: post.image_paths ? post.image_paths.map(imagePath => `${config.oss.endpoint}/${imagePath}`): [],
//                 }
//             })
//         }catch (error: any) {
//             res.status(400).json({
//                 message: error.message || '临时文章上传失败',
//             })
//         }
//     }

//     /**
//      * 上传完整文章接口（发布文章）
//      * @description 功能：发布完整文章（状态为published），处理临时文件迁移、内容中图片URL替换
//      * @description 请求方式：POST（参数通过req.body传递，封面文件通过req.file传递）
//      * @description 响应：返回发布后的文章完整信息，含正式文件路径
//      */
//     public static async uploadCompleteArticle(req: Request, res: Response) { 
//         let post_path: string | null = null;
//         let coverRollbackFn: (() => Promise<void>) | null = null;
//         try {
//             // 解析参数，参数校验，解引用参数
//             parseJsonFields(req.body, ['categories', 'tags', 'image_urls']);
//             const { value, error } = uploadCompleteArticleSchema.validate(req.body);
//             if (error) {
//                 console.log(error.message)
//                 throw new BadRequestError(error.message||'请求参数有误或格式错误');
//             }
//             const { title, description, status, categories, tags, content, image_urls } = req.body;

//             // 封面文件处理，并上传到OSS
//             const file = req.file as Express.Multer.File;
//             const coverRes = await uploadToOSS(file, 'uploads/images/articles/covers');
//             const { path: coverPath, url: coverUrl, rollback: coverRollback } = coverRes
//             coverRollbackFn = coverRollback;

//             // 处理内容中的图片URL，并上传到OSS，并替换原来的文章中的图像URL
//             const imagePaths: string[] = (image_urls as string[] || []).map(imageUrl => {
//                 const { pathname } = new URL(imageUrl);
//                 return pathname
//             }) || [];
//             const imageRes = await bulkUploadLocalToOSS(imagePaths, 'uploads/images/articles/imgs');
//             const processedImagePaths = imageRes.filter(res=>res.success).map(res => res.path);
//             const publicDir = path.join(__dirname, '../../public');
//             const formalContent = await PostController.replaceTempUrlWithOssUrl(
//                 content,
//                 imageRes,
//                 config.serverUrl as string,
//                 publicDir
//             );

//             console.log("处理后的内容：", formalContent);

//             // 创建内容文件
//             const destDir = status === 'published' ? '/uploads/articles/contents' : '/uploads/temp/contents';
//             post_path = await createLocalFile(destDir, formalContent, 'md');
            
//             // 创建文章
//             const post = await PostService.uploadCompleteArticle({
//                 title,
//                 description,
//                 status,
//                 categories,
//                 tags,
//                 post_path,
//                 cover_path: coverPath ?? null,
//                 image_paths: processedImagePaths || [],
//             })
//             if (!post) {
//                 throw new BadRequestError('文章保存失败');
//             }
//             res.status(200).json({
//                 message: '文章保存成功',
//                 data: {
//                     ...camelcaseKeys(
//                         post.get({ plain: true }),
//                         { deep: true },
//                     ),
//                     cover_path: coverPath ? `${config.oss.endpoint}/${coverPath}` : null,
//                     image_urls: post.image_paths ? post.image_paths.map(imagePath => `${config.oss.endpoint}/${imagePath}`): [],
//                     content: formalContent,
//                 }
//             });
//         } catch (error: any) {
//             console.log(`[] uploadCompleteArticle error: ${error}`)
//             if (post_path) {
//                 await deleteLocalFile(post_path);
//             }
//             if (coverRollbackFn) {
//                 await coverRollbackFn();
//             }
//             res.status(error.status || 400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             });
//         }
//     }

//     /**
//      * 文章删除接口（含关联数据）
//      * - 功能：删除文章及其关联数据（如关联的分类、标签、文件）
//      * - 请求方式：DELETE（文章ID通过req.params.id传递）
//      * - 响应：返回删除成功提示，内部调用Service处理关联删除逻辑
//      */
//     public static async deletePostWithAssociations(req: Request, res: Response) {
//         try {
//             // 参数校验
//             const { value, error } = deletePostWithAssociationsSchema.validate({
//                 id: req.params.id,
//             });
//             if (error) {
//                 throw new BadRequestError(error.message||'请求参数有误或格式错误');
//             }

//             // 调用服务层处理逻辑
//             await PostService.deletePostWithAssociations(Number(value.id));

//             // 返回结果
//             res.status(200).json({
//                 message: '文章删除成功',
//             });
//         } catch (error: any) {
//             console.error('[PostController.deletePostWithAssociations]', error.message || '请求参数有误或格式错误')
//             res.status(error.status || 400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             });
//         }
//     }
// }

