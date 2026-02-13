import { InternalServerError } from './errors';
import sharp from 'sharp';

/** ---------- 类型定义 ---------- */
/** 图片信息类型 */
export interface ImageInfo { 
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 图片类型 */
  type: string;
  /** 图片大小（字节） */
  size: number;
}

/** 缩略图生成选项 */
export interface ThumbnailOptions {
  fit?: keyof sharp.FitEnum;
  position?: number | string;
  background?: string | object;
  format?: keyof sharp.FormatEnum; // 输出格式
  quality?: number; // 输出质量
}

/** 图片压缩选项 */
export interface CompressOptions {
  format?: keyof sharp.FormatEnum; // 目标格式，默认为 avif
  quality?: number;   // 压缩质量（默认80）
  effort?: number;  // 压缩效率（默认6）
  lossless?: boolean; // 无损压缩（默认false）
  chromaSubsampling?: '4:4:4' | '4:2:0' | '4:2:2';
}


/** 
 * 获取图片的基础信息
 * @param buffer 图片数据
 * @returns 图片信息
 */
export const getImageInfo = async (buffer: Buffer): Promise<ImageInfo> => {
  try {
    // 使用 sharp 获取元数据，比 image-size 支持更多格式且与后续处理保持一致
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      type: metadata.format || '',
      size: metadata.size || buffer.length // 优先使用 metadata 中的 size，如果不存在则使用 buffer 长度
    }
  } catch (error: any) {
    // 保留原始错误信息以便调试
    throw new Error(`图片信息获取失败: ${error.message}`);
  }
};

export const generateThumbnail = async(
  buffer: Buffer,
  width: number,
  height: number,
  options?: ThumbnailOptions
): Promise<Buffer> => {
  try {
    const {
      fit = 'cover',
      position = 'center',
      background,
      format, // 默认保持原格式或由 sharp 决定
      quality = 80
    } = options || {};

    let pipeline = sharp(buffer)
      .resize(width, height, {
        fit,
        position,
        background
      });

    // 如果指定了格式，则进行转换
    if (format) {
      pipeline = pipeline.toFormat(format, { quality });
    }

    return await pipeline.toBuffer();
  } catch (error: any) {
    throw new Error(`缩略图生成失败: ${error.message}`);
  }
}


/** ---------- 压缩图片（默认AVIF格式，支持配置） ---------- */
export const compressImage = async (
  buffer: Buffer,
  options?: CompressOptions
): Promise<Buffer> => {
  try {
    const {
            format = 'avif', // 默认使用 avif
            quality = 60,    // 默认质量下调至 60
            effort = 3,      // 默认 effort 下调至 3
            lossless = false,
            chromaSubsampling = '4:2:0'
        } = options || {};

        // 基础通用配置
        const outputOptions: any = {
            quality,
            effort,
            lossless,
            chromaSubsampling
        };

        // 针对不同格式的特定深度优化
        switch (format) {
            case 'jpeg':
            case 'jpg':
                outputOptions.mozjpeg = true;           // 使用 mozjpeg 算法
                outputOptions.trellisQuantisation = true; // 启用网格量化 (减小体积)
                outputOptions.overshootDeringing = true;  // 减少边缘振铃效应
                break;
            case 'png':
                if (!lossless) {
                    outputOptions.palette = true;       // 使用调色板量化 (显著减小体积)
                }
                outputOptions.compressionLevel = 6;     // zlib 压缩级别 (平衡速度)
                outputOptions.adaptiveFiltering = true; // 自适应过滤
                break;
            case 'webp':
                outputOptions.smartSubsample = true;    // 智能子采样
                break;
            case 'gif':
                outputOptions.reoptimise = true;        // 重新优化 GIF 帧
                break;
            // avif 已通过 defaults (effort/chromaSubsampling) 优化，无需额外特定参数
        }

        return await sharp(buffer)
            .toFormat(format, outputOptions)
            .toBuffer();
    
  } catch (error: any) {
    console.error('图片压缩失败详细信息：', error);
    // 使用统一的错误处理类
    throw new InternalServerError(`图片压缩失败: ${error.message}`, error);
  }
}
