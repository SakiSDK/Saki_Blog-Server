import { Image } from '@/models/Image.model';
import { Transaction } from 'sequelize';
import { BadRequestError, InternalServerError, NotFoundError } from '@/utils/errors';
import { config } from '@/config';
import path from 'path';
import fs from 'fs/promises'
import { ImageSceneType } from '@/constants/image.scene';
import { SCENE_DIR_MAP } from '@/constants/image.constants';
import pMap from 'p-map';
import { getMimeTypeFromExt } from '@/utils/file.util';
import { generateThumbnail, ThumbnailOptions } from '@/utils/image.util';



/** ---------- 类型定义 ---------- */
/** 图片类型 */
export interface ImageRecord {
  /** 图片路径或URL */
  path: string;
  /** 图片大小 */
  size: number;
  /** 图片类型 */
  type: string;
  /** 如果图片是属于某篇文章，可以关联文章 ID */
  postId?: number | null;
  /** 上传者的用户 ID */
  userId?: number | null;
  /** 存储位置 */
  storage: 'local' | 'oss';
  /** 上传时间 */
  uploadedAt: Date;
}


export class ImageService {
  /** 
   * 根据原图路径获取缩略图的 URL
   * @param {string} pathParam - 原图相对路径
   * @returns {Promise<string>} - 缩略图的 URL
   */
  public static async getThumbUrl(pathParam: string): Promise<string> {
    if (!pathParam) return '';

    try {
      // 1. 尝试提取相对路径 (兼容完整 URL)
      let relativePath = pathParam;
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        try {
          relativePath = new URL(relativePath).pathname;
        } catch {}
      }

      // 2. 规范化路径：移除 /uploads 前缀，统一使用正斜杠
      let fsPath = relativePath.replace(/\\/g, '/');
      // 移除开头可能的 /uploads/ 或 uploads/
      if (fsPath.startsWith('/uploads/')) {
        fsPath = fsPath.substring(9);
      } else if (fsPath.startsWith('uploads/')) {
        fsPath = fsPath.substring(8);
      }
      fsPath = fsPath.replace(/^\/+/, ''); // 移除开头的斜杠

      // 3. 检查是否符合 "main" -> "thumb" 的目录结构
      // 目前只有 covers (article_cover/album_cover) 采用了 main/thumb 分离存储的结构
      if (fsPath.includes('/main/') || fsPath.includes('covers/main/')) {
        // 替换目录: main -> thumb
        // 兼容可能的不同路径结构，这里直接替换 /main/ 为 /thumb/
        let thumbRelPath = fsPath.replace('/main/', '/thumb/');
        
        // 替换后缀: xxx.ext -> xxx_thumb.avif
        const lastDotIndex = thumbRelPath.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          thumbRelPath = thumbRelPath.substring(0, lastDotIndex) + '_thumb.avif';
        } else {
          thumbRelPath += '_thumb.avif';
        }

        // 4. 检查缩略图文件是否存在
        const rootDir = path.resolve(config.upload.rootPath);
        const absThumbPath = path.resolve(rootDir, thumbRelPath);

        await fs.access(absThumbPath);
        
        // 存在则返回缩略图 URL
        return `${config.serverUrl}/uploads/${thumbRelPath}`;
      }
    } catch (error) {
      // 忽略所有错误（文件不存在、路径解析失败等），直接降级返回原图
    }

    // 默认返回原图 URL
    return this.getOriginUrl(pathParam);
  }
  /** 
   * 获取原图的 URL
   * @param {string} path - 原图相对路径
   * @returns {Promise<string>} - 原图的 URL
   */
  public static async getOriginUrl(path: string): Promise<string> {
    return `${config.serverUrl}${path}`;
  }
  /** 
   * 获取指定目录下的图片大小单位(字节)
   * @param {string} relativePath - 相对路径，相对于上传根目录
   * @returns {Promise<number>} - 图片大小单位(字节)
   */
  public static async getImageSize(relativePath: string): Promise<number> {
    if (!relativePath) return 0;

    const absPath: string = path.join(config.upload.rootPath, relativePath);
    try {
      const stats = await fs.stat(absPath);
      return stats.size;
    } catch (error) {
      // 文件不存在直接返回0
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
      throw new InternalServerError(`获取图片大小失败: ${(error as any).message}`);
    }
  }
  
  /** 
   * 内部私有方法，删除指定目录的图片
   * @param {string} relativePath - 相对路径，相对于上传根目录
   * @throws {BadRequestError} - 如果路径包含上级目录遍历符
   * @throws {InternalServerError} - 如果删除图片失败
   */
  private static async safeUnlink(relativePath: string) {
    if (!relativePath) return;

    // 防止 ../ 越权
    if(relativePath.includes('..')) {
      throw new BadRequestError('非法文件路径，包含上级目录遍历符');
    }

    const absPath: string = path.join(config.upload.rootPath, relativePath);

    try {
      await fs.unlink(absPath);
    } catch (error) {
      // 文件不存在直接忽略
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new InternalServerError(`删除图片失败: ${(error as any).message}`);
    }
  }

  /** 
  * 删除图片（临时 / 正式）
  * @param {string} path - 图片相对路径
  */
  public static async deleteImage(path: string) {
    await this.safeUnlink(path);
  }

  /** 
   * 批量删除图片（临时 / 正式）
   * @param {string[]} paths - 图片相对路径列表
   */
  public static async deleteImages(paths: string[]) {
    if (!Array.isArray(paths) || paths.length === 0) return;

    await pMap(paths, this.safeUnlink.bind(this), { concurrency: 5 });
  }

  /**
   * 将图片复制到正式目录，可以指定目录
   * @param {string} tempPath - 临时图片路径
   * @param {ImageSceneType} scene - 图片使用场景
   * @returns {Promise<string>} - 正式图片路径
   * @example
   * ImageService.copyToFormalDir('/temp/123.jpg', ImageSceneType.Article);
   * // 返回: '/images/article/2023/08/123.jpg'
   */
  public static async copyToFormalDir(
    tempPath: string,
    scene: ImageSceneType,
  ): Promise<string> {
    const rootDir: string = config.upload.rootPath;
    const baseDir: string = SCENE_DIR_MAP[scene];
    if (!baseDir) { 
      throw new BadRequestError(`未知图片使用场景: ${scene}`);
    }

    const publishAt: Date = new Date();
    const year: string = publishAt.getFullYear().toString();
    const month: string = String(publishAt.getMonth() + 1).padStart(2, '0');

    /** 指定的正式目录 */
    const targetDir = path.join(
      rootDir,
      baseDir,
      `${year}`,
      `${month}`,
    )

    await fs.mkdir(targetDir, { recursive: true });

    const filename: string = path.basename(tempPath);
    const targetPath: string = path.join(targetDir, filename);

    /** 标准化后的临时路径 */
    let normalizedTempPath = path.normalize(tempPath);
    // 剔除重复 uploads 前缀
    if (normalizedTempPath.startsWith('/uploads/') || normalizedTempPath.startsWith('\\uploads\\')) {
      normalizedTempPath = normalizedTempPath.substring(8);
    } else if (normalizedTempPath.startsWith('uploads/') || normalizedTempPath.startsWith('uploads\\')) {
      normalizedTempPath = normalizedTempPath.substring(7);
    }
    normalizedTempPath = normalizedTempPath.replace(/^[/\\]+/, '');

    /** 当前存放图片的临时路径 */
    const src = path.join(config.upload.rootPath, normalizedTempPath)
    /** 存放图片的正式路径 */
    const dest = path.join(targetDir, filename)

    await fs.copyFile(src, dest)

    // 修复：返回以 /uploads/ 开头的 Web 访问路径，并统一使用正斜杠
    const relativePath = path.relative(config.upload.rootPath, targetPath);
    return `/uploads/${relativePath.split(path.sep).join('/')}`;
  }

  /** 
   * 批量将主图片移动到正式目录，可以指定目录
   * @param {string[]} tempPaths - 临时图片路径列表
   * @param {ImageSceneType} scene - 图片使用场景
   * @param {number} [concurrency=5] - 并发数量，默认5
   * @returns {Promise<string[]>} - 正式图片路径列表
   * @example
   * ImageService.copyToFormalDirBatch([
   *   '/temp/123.jpg',
   *   '/temp/456.jpg'
   * ], ImageSceneType.Article);
   * // 返回: ['/images/article/2023/08/123.jpg', '/images/article/2023/08/456.jpg']
   */
  public static async copyToFormalDirBatch(
    tempPaths: string[],
    scene: ImageSceneType,
    concurrency: number = 5,
  ): Promise<string[]> {
    const moved: string[] = [];
    const failed: { path: string; reason: Error }[] = [];

    console.log('开始批量移动图片 tempPaths:', tempPaths)

    // 使用 p-map 控制并发数，防止跑太多导致内存或网络崩掉
    await pMap(
      tempPaths,
      async (tempPath: string) => {
        try {
          console.log('开始移动图片 tempPath:', tempPath)
          const movedPath = await ImageService.copyToFormalDir(tempPath, scene);
          moved.push(movedPath);
        } catch (error) {
          failed.push({ path: tempPath, reason: error as Error });
        }
      },
      { concurrency }
    )

    if (failed.length > 0) {
      // 发生错误时，回滚已经复制成功的图片，保证原子性
      if (moved.length > 0) {
        await ImageService.deleteImages(moved).catch(err => {
          console.error('[ImageService] 批量复制失败回滚时发生错误:', err);
        });
      }

      throw new InternalServerError(
        `批量复制图片到正式目录失败 ${failed.length} 个`,
        { failed }
      );
    }

    return moved;
  }

  /** 
   * 将图片 URL 统一转换为相对路径
   * @param {string} url - 图片完整 URL
   * @returns {string} - 图片相对路径
   * @example
   * ImageService.normalizeUrl('https://example.com/images/123.jpg');
   * // 返回: '/images/123.jpg'
   */
  public static normalizeImagePath(url: string = '') {
    try {
      return new URL(url).pathname
    } catch (err) {
      // 非合法 URL（比如已经是相对路径），直接返回原值
      return url
    }
  }

  /** 
   * 将图片完整 URL 列表统一转化为“相对路径”
   * @param {string[]} ruls - 图片完整 URL 列表
   * @returns {string[]} - 图片相对路径列表
   * @example
   * ImageService.normalizeUrls([
   *   'https://example.com/images/123.jpg',
   *   'https://example.com/images/456.jpg'
   * ]);
   * // 返回: ['/images/123.jpg', '/images/456.jpg']
   */
  public static normalizeImagePaths(urls: string[] = []) {
    if (!Array.isArray(urls)) return []

    return urls
      .filter(Boolean) // 过滤 null / undefined / ''
      .map(url => {
        try {
          return new URL(url).pathname
        } catch (err) {
          // 非合法 URL（比如已经是相对路径），直接返回原值
          return url
        }
      })
  }

  /** 
   * 验证图片路径的图片是否存在 
   * @param {string} pathParam - 图片路径
   * @param transaction - 数据库事务（可选）
   * @throws NotFoundError - 图片不存在时抛出错误
   */
  public static async validateExist(pathParam: string, transaction?: Transaction) {
    // 路径安全校验（防御路径穿越攻击）
    if (!pathParam || typeof pathParam !== 'string') {
      throw new BadRequestError('图片路径不能为空');
    }

    // 规范化路径校验并校验是否在 uploads 目录中
    const rootDir = path.resolve(config.upload.rootPath);
    let normalizedPath = path.normalize(pathParam);
    
    // 修复：如果路径包含 /uploads 前缀（通常是 URL），需要去除，因为 rootDir 已经包含了 uploads
    // 例如：/uploads/temp/xxx -> temp/xxx
    if (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('\\uploads\\')) {
      normalizedPath = normalizedPath.substring(8); // remove '/uploads'
    } else if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('uploads\\')) {
      normalizedPath = normalizedPath.substring(7); // remove 'uploads'
    }

    // 移除开头的斜杠，确保 path.resolve 将其视为相对路径
    normalizedPath = normalizedPath.replace(/^[/\\]+/, '');

    const absolutePath = path.resolve(rootDir, normalizedPath);

    if (!absolutePath.startsWith(rootDir)) {
      throw new BadRequestError(`非法图片路径: ${pathParam}`);
    }

    // 文件存在性校验
    try {
      const stats = await fs.stat(absolutePath);
      // 严格校验：必须是文件（防目录遍历）
      if (!stats.isFile()) {
        throw new NotFoundError(`路径存在但非文件: ${pathParam}`);
      }
      // 校验文件大小(防止空文件)
      if (stats.size === 0) {
        throw new NotFoundError(`路径存在但文件为空: ${pathParam}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`图片物理文件不存在: ${pathParam}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new InternalServerError(`无权访问图片文件: ${pathParam}`);
      }
      throw new InternalServerError(`验证图片文件时发生错误: ${(error as Error).message}`);
    }
  }

  /** 
   * 批量验证图片路径的图片是否存在
   * @param {string[]} paths - 图片路径数组
   * @param transaction - 数据库事务（可选）
   * @throws NotFoundError - 包含所有缺失路径（附带结构化数据）
   * @throws BadRequestError - 路径非法时立即中断（如路径穿越）
   * @throws InternalServerError - 非本地存储调用时立即中断
   * 
   * @example
   * try {
   *   await ImageService.validateExistBatch(['/a.jpg', '/b.jpg']);
   * } catch (e) {
   *   if (e instanceof NotFoundError && e.missingPaths) {
   *     // 前端可精准提示：「以下图片缺失：a.jpg, b.jpg」
   *   }
   * }
   */
  public static async validateExistBatch(paths: string[], transaction?: Transaction) {
    // 预处理：去重 + 去除无效路径
    const cleanedPaths = [
      ...new Set(
        paths.filter(
          (path) => path &&
            typeof path === 'string' &&
            path.trim() !== ''
        ).map(path => path.trim())
      )
    ]

    // 并发验证（使用 allSettled 避免单点失败中断）
    const results = await Promise.allSettled(
      cleanedPaths.map(path =>
        ImageService.validateExist(path, transaction)
          .then(() => ({ path, success: true as const }))
          .catch(error => ({ path, success: false as const, error }))
      )
    )

    // 智能错误聚合
    const missingPaths: string[] = [];
    const criticalErrors: { path: string; error: Error }[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && !result.value.success) {
        const { path, success, error } = result.value;
        if (!success) {
          // 区分错误类型：仅 NotFoundError 收集，其他立即标记为严重错误
          if(error instanceof NotFoundError) {
            missingPaths.push(path);
          } else {
            criticalErrors.push({ path, error });
          }
        }
      }

      // 有限处理严重错误 (路径非法/存储类型错误)
      if (criticalErrors.length > 0) {
        // 取第一个严重错误（通常为配置错误，需立即修复）
        const firstCritical = criticalErrors[0];
        // 增强错误上下文
        (firstCritical.error as any).context = {
          batchOperation: 'validateExistBatch',
          failedPath: firstCritical.path,
          totalPaths: cleanedPaths.length
        };
        throw firstCritical.error;
      }

      // 📦 5. 统一报告缺失文件（优化长消息）
      if (missingPaths.length > 0) {
        const displayLimit = 5;
        const displayed = missingPaths.slice(0, displayLimit).join('、');
        const suffix = missingPaths.length > displayLimit 
          ? ` 等 ${missingPaths.length} 个文件` 
          : '';
        
        const error = new NotFoundError(
          `图片文件不存在：${displayed}${suffix}`,
          { 
            missingPaths, // 结构化数据供前端精准处理
            totalMissing: missingPaths.length 
          }
        );
        // 附加缺失路径到错误对象（兼容自定义错误类）
        (error as any).missingPaths = missingPaths;
        throw error;
      }
    }
  }

  /** 
   * 创建图片存储记录
   * @param {ImageRecord} params - 图片记录参数
   * @param {Transaction} transaction - 数据库事务（可选）
   * @returns 创建的图片记录
   */
  public static async createImageRecord(
    params: ImageRecord,
    transaction?: Transaction
  ): Promise<Image> {
    const { path, size, type, userId, postId, storage } = params;

    // 参数校验
    if (!path || typeof path !== 'string' || !path.trim()) {
      throw new BadRequestError('图片路径不能为空')
    }
    if (!Number.isInteger(size) || size <= 0) {
      throw new BadRequestError(`无效的图片大小: ${size}必须是正整数`)
    }
    if(!type || typeof type !== 'string' || !type.trim() || !config.upload.allowedImageTypes.includes(type)){
      throw new BadRequestError(`无效的图片类型: ${type}，必须是 ${config.upload.allowedImageTypes.join(', ')}`)
    }
    // 安全校验：路径必须为相对路径（禁止http/https/..）
    if (/^(https?:|\/\/|\.\/|\.\.\/)/i.test(path.trim())) {
      throw new BadRequestError('图片路径必须为服务器相对路径（如 /uploads/...）');
    }

    // 路径规范化（确保存储格式统一）
    const normalizedPath = path
      .trim()
      .replace(/\/+/g, '/') // 合并多余斜杠
      .replace(/\/$/, '');  // 移除尾部斜杠

    // 构建数据库数据
    const createData: ImageRecord = {
      path: normalizedPath,
      size,
      type: type.toLowerCase().trim(),
      postId: postId && Number.isInteger(postId) ? postId : null,
      userId: userId && Number.isInteger(userId) ? userId : null,
      storage,
      uploadedAt: new Date(),
    }

    // 写入数据库
    const image = await Image.create(
      createData,
      transaction ? {
        transaction,
        raw: true,
      } : {
        raw: true,
      }
    )

    return image
  }

  /** 
   * 批量创建图片存储记录
   * @param {ImageRecord[]} params - 图片记录参数数组
   * @param {Transaction} transaction - 数据库事务（可选）
   * @returns 创建的图片记录数组
   */
  public static async createImageRecords(
    params: ImageRecord[],
    transaction?: Transaction
  ): Promise<Image[]> {
    // 参数校验
    if(!Array.isArray(params) || params.length === 0) {
      throw new BadRequestError('图片记录参数数组不能为空')
    }

    // 并发控制：单次最多同时 5 条
    const CONCURRENCY = 5;

    try {
      const images = await pMap(
        params,
        async (param) => await this.createImageRecord(param, transaction),
        {
          concurrency: CONCURRENCY,
          stopOnError: true
        }
      )
      
      return images;
    } catch (error) {
      // 这里不处理错误，交给 controller 处理
      throw error;
    }
  }

  /**
   * 将 Web 路径或相对路径解析为服务器文件系统的绝对路径
   * @param imagePath Web 路径 (e.g. /uploads/xxx) 或 相对路径
   * @returns 绝对路径
   * @throws Error 如果路径非法（目录遍历攻击）
   */
  public static resolveAbsolutePath(imagePath: string): string {
    const rootDir = path.resolve(config.upload.rootPath);
    let relativePath = imagePath;

    // 移除可能的 /uploads 前缀
    if (relativePath.startsWith('/uploads/') || relativePath.startsWith('\\uploads\\')) {
      relativePath = relativePath.substring(8);
    } else if (relativePath.startsWith('uploads/') || relativePath.startsWith('uploads\\')) {
      relativePath = relativePath.substring(7);
    }
    
    relativePath = relativePath.replace(/^[/\\]+/, '');
    const absolutePath = path.resolve(rootDir, relativePath);

    // 安全检查：防止目录遍历攻击
    if (!absolutePath.startsWith(rootDir)) {
      throw new BadRequestError(`非法文件路径: ${imagePath}`);
    }

    return absolutePath;
  }

  /**
   * 获取图片文件的元数据（大小、类型）
   * @param imagePath Web 路径或相对路径
   */
  public static async getImageMetadata(imagePath: string) {
    const absolutePath = this.resolveAbsolutePath(imagePath);
    
    try {
      const stats = await fs.stat(absolutePath);
      const ext = path.extname(absolutePath);
      const type = getMimeTypeFromExt(ext) || 'application/octet-stream';
      
      return {
        size: stats.size,
        type,
        absolutePath
      };
    } catch (error) {
      throw new NotFoundError(`无法获取图片信息: ${imagePath}`);
    }
  }

  /**
   * 生成图片缩略图
   * @param imagePath 图片路径 (绝对路径或相对于 rootPath 的路径)
   * @param options 缩略图配置
   */
  public static async generateThumbnail(
    imagePath: string,
    options: ThumbnailOptions & { width: number; height: number; outputDir?: string; scene?: ImageSceneType }
  ): Promise<string> {
    const rootDir = path.resolve(config.upload.rootPath);
    let absolutePath = '';
    
    try {
      absolutePath = this.resolveAbsolutePath(imagePath);
    } catch (e) {
      // 兼容旧逻辑：如果解析失败（比如不是标准Web路径），尝试直接作为绝对路径或相对路径处理
      // 但 resolveAbsolutePath 已经处理了大部分情况。这里主要是为了防止 resolveAbsolutePath 抛出的 Error 阻断流程
      // 如果 imagePath 本身就是绝对路径且在 rootDir 外（虽然 resolveAbsolutePath 会拦截），
      // 但这里为了保持 generateThumbnail 的健壮性，可以保留一点容错，或者直接让它抛出。
      // 鉴于 generateThumbnail 之前的逻辑也是类似的解析，我们可以直接使用 resolveAbsolutePath。
      // 如果 resolveAbsolutePath 抛错，说明路径确实非法。
      console.warn(`[ImageService] 路径解析失败: ${imagePath}`, e);
      return '';
    }

    try {
      // 检查源文件是否存在
      try {
        await fs.access(absolutePath);
      } catch {
        console.warn(`[ImageService] 原图不存在，跳过缩略图生成: ${absolutePath}`);
        return '';
      }

      const fileBuffer = await fs.readFile(absolutePath);
      const { width, height, outputDir, scene, ...thumbOptions } = options;
      
      const thumbBuffer = await generateThumbnail(fileBuffer, width, height, {
        format: 'avif', // 默认转为 AVIF
        quality: 60,
        ...thumbOptions
      });

      // 确定输出目录
      let outputDirAbs = path.dirname(absolutePath);
      
      if (scene && SCENE_DIR_MAP[scene]) {
        const publishAt: Date = new Date();
        const year: string = publishAt.getFullYear().toString();
        const month: string = String(publishAt.getMonth() + 1).padStart(2, '0');
        
        outputDirAbs = path.join(rootDir, SCENE_DIR_MAP[scene], year, month);
      } else if (outputDir) {
        if (path.isAbsolute(outputDir)) {
          outputDirAbs = outputDir;
        } else {
          outputDirAbs = path.resolve(rootDir, outputDir);
        }
      }
      
      await fs.mkdir(outputDirAbs, { recursive: true });

      const ext = path.extname(absolutePath);
      const name = path.basename(absolutePath, ext);
      const thumbFilename = `${name}_thumb.avif`;
      const thumbPath = path.join(outputDirAbs, thumbFilename);

      await fs.writeFile(thumbPath, thumbBuffer);
      
      // 返回缩略图的 Web 访问路径 (如果是在 upload root 下)
      if (thumbPath.startsWith(rootDir)) {
        const relativeThumb = path.relative(rootDir, thumbPath);
        return '/uploads/' + relativeThumb.split(path.sep).join('/');
      }

      return thumbPath;
    } catch (error) {
      console.error('[ImageService] 生成缩略图失败:', error);
      throw error;
    }
  }

  /**
   * 收集本地图片记录信息
   * @param params.imagePaths 图片路径列表
   * @param params.postId 文章 ID
   * @param params.userId 用户 ID
   */
  public static async collectLocalImageRecords(params: {
    imagePaths: string[]
    postId?: number
    userId?: number
  }): Promise<ImageRecord[]> {
    const records: ImageRecord[] = []
    const rootDir = path.resolve(config.upload.rootPath)

    for (const imgPath of params.imagePaths) {
      try {
        const { size, type } = await ImageService.getImageMetadata(imgPath);

        records.push({
          path: imgPath, // 数据库存储原始Web路径
          size,
          type,
          postId: params.postId ?? null,
          userId: params.userId ?? null,
          storage: 'local',
          uploadedAt: new Date()
        });
      } catch (error) {
        console.warn(`[ImageService] 无法获取图片信息，跳过关联: ${imgPath}`);
        // 继续处理下一张图片
      }
    }

    return records
  }
}