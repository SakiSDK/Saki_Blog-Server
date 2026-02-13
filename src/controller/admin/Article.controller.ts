import { ArticlePayload, ArticleService } from '@/services/Article.service';
import { Request, Response } from 'express';
import { TagService } from '@/services/Tag.service';
import { CategoryService } from '@/services/Category.service';
import { ImageService } from '@/services/Image.service';
import path from 'path';
import { UserService } from '@/services/User.service';
import { SCENE_DIR_MAP } from '@/constants/image.constants';

/** ---------- 辅助函数 ---------- */
/** 
 * 标准化ID列表
 * @param val 原始ID值（可能是字符串数组或数字数组）
 * @returns 标准化后的数字ID数组
*/
const normalizeIds = (val: unknown): number[] => {
  if (Array.isArray(val)) {
    return val.map(id => Number(id));
  }
  return [];
};

/**
 * 替换文章内容里的临时图片路径为正式路径
 * @param {string} rawContent 原始文章内容
 * @param {string} tempDir 临时图片路径目录（原始上传的 temp 路径）
 * @param {string} formalDir 正式图片路径目录（moveToFormalDirBatch 返回的相对路径）
 * @returns {string} 替换后的文章内容
 */
export const replaceImagePaths = (
  rawContent: string,
  tempDir: string,
  formalDir: string
): string => {
  // 转移正则表达式
  const tempDirRegex = new RegExp(tempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return rawContent.replace(tempDirRegex, formalDir);
};


/** ---------- 主函数 ---------- */      
export class ArticleController {
  public static async createArticle(req: Request, res: Response) {
    let coverPath: string | null = null;
    let imagePaths: string[] | null = null;
    try {
      const {
        authorId: rawAuthorId,
        title,
        description,
        status,
        content: rawContent,
        categories: rawCategories,
        tags: rawTags,
        cover: rawCoverPath,
        imagePaths: rawImageUrls,
        priority,
        allowComment,
      } = req.body;

      console.log('priority type:', typeof priority);

      // 确保 imagePaths 是数组类型
      let normalizeRawImageUrls: string[] = [];
      if (!Array.isArray(rawImageUrls)) {
        normalizeRawImageUrls = [rawImageUrls];
      } else {
        normalizeRawImageUrls = rawImageUrls;
      }


      // 确保 priority 是数字类型
      const parsedPriority = priority ? Number(priority) : 0;
      // 确保 allowComment 是布尔类型
      const parsedAllowComment = allowComment === 'true' || allowComment === true;

      // 校验作者ID是否存在
      const authorId = await UserService.verifyUserId(rawAuthorId);

      // 标准化标签和分类的ID列表
      const tags = normalizeIds(rawTags);
      const categories = normalizeIds(rawCategories);
      // 验证标签和分类字段是否存在
      await TagService.validateTagsExist(tags);
      await CategoryService.validateCategoriesExist(categories);

      // 标准化图片URL列表为相对路径
      const tempCoverPath = ImageService.normalizeImagePath(rawCoverPath);
      const tempImagePaths = ImageService.normalizeImagePaths(normalizeRawImageUrls);


      // 验证封面图是否存在
      await ImageService.validateExist(tempCoverPath);
      // 验证文章内容中图片列表是否存在
      await ImageService.validateExistBatch(tempImagePaths);

      // 验证成功后，拷贝图片到正式目录，返回正式路径，后续操作成功后删除临时文件
      coverPath = await ImageService.copyToFormalDir(tempCoverPath, 'article_cover');
      imagePaths = await ImageService.copyToFormalDirBatch(tempImagePaths, 'article_image'); 
    
      // 生成文章封面的缩略图，到指定目录
      await ImageService.generateThumbnail(coverPath, {
        width: 200,
        height: 200,
        scene: 'article_cover_thumb',
      });

      // 临时存放的目录地址和正式存放的目录地址
      let content = rawContent;
      if (tempImagePaths && tempImagePaths.length > 0 && imagePaths && imagePaths.length > 0) {
        const imageTempDir = path.dirname(tempImagePaths[0]);
        const imageFormalDir = path.dirname(imagePaths[0]);

        // 将文章内容(content)中的图片路径替换成正式目录的图片路径，替换完成了后的文章内容
        content = replaceImagePaths(rawContent, imageTempDir, imageFormalDir);
      }

      const payload: ArticlePayload = {
        authorId,
        title,
        description,
        status,
        categories,
        tags,
        content,
        coverPath,
        imagePaths,
        priority: parsedPriority,
        allowComment: parsedAllowComment,
      };

      const article = await ArticleService.createArticle(payload);

      // 假如创建成功了，再删除临时目录中的图片
      if (article) {
        await ImageService.deleteImages([tempCoverPath, ...tempImagePaths]);
      }

      res.status(201).json({
        code: 201,
        message: '文章创建成功',
        success: true,
        data: article,
      });
    } catch (error: any) {
      console.error('创建文章失败:', error);
      
      // 回滚图片
      const pathsToDelete: string[] = [];
      if (coverPath) pathsToDelete.push(coverPath);
      if (imagePaths) pathsToDelete.push(...imagePaths);
      if (pathsToDelete.length > 0) {
        await ImageService.deleteImages(pathsToDelete);
      }

      res.status(500).json({
        code: 500,
        message: error.message || '创建文章失败',
        success: false,
        data: null,
      });
    }
  }
  /**
   * @description: 获取文章列表
   * GET /admin/article/
   */
  public static async getArticleList(req: Request, res: Response) {
    try {
      const query = req.query;
      const result = await ArticleService.getArticleList(query as any);
      
      res.status(200).json({
        code: 200,
        message: '文章列表获取成功',
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('获取文章列表失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '获取文章列表失败',
        success: false,
        data: null,
      });
    }
  }
}