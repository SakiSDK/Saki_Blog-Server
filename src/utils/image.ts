import sizeOf from 'image-size';
import sharp from 'sharp';


// 获取图片的信息
export const getImageInfo = async (buffer: Buffer): Promise<{
    width: number;
    height: number;
    type: string;
}> => {
    try {
        const dimensions = sizeOf(buffer);
        return {
            width: dimensions.width || 0,
            height: dimensions.height || 0,
            type: dimensions.type || ''
        }
    } catch (error) {
        throw new Error('图片信息获取失败');
    }
};

export const generateThumbnail = async(
    buffer: Buffer,
    width: number,
    height: number
): Promise<Buffer> => {
    try {
        return await sharp(buffer)
            .resize(width, height, {
                fit: 'cover',
                position: 'center'
        })
        .toBuffer();
    } catch (error) {
        throw new Error('缩略图生成失败');
    }
}


/** ---------- 压缩图片（AVIF格式） ---------- */
export const compressImage = async (
    buffer: Buffer,
    options?: {
        quality?: number;   // 压缩质量（默认80）
        effort?: number;    // 压缩效率（默认6）
        lossless?: boolean; // 无损压缩（默认false）
        chromaSubsampling?: '4:4:4' | '4:2:0' | '4:2:2';
    }
): Promise<Buffer> => {
    try {
        const {
            quality = 70,
            effort = 6,
            lossless = false,
            chromaSubsampling = '4:2:0'
        } = options || {};

        const compressedBuffer = await sharp(buffer)
            .toFormat('avif', {
                quality,
                effort,
                lossless,
                chromaSubsampling
            })
            .toBuffer();
        
        return compressedBuffer;
    } catch (error) {
        console.error('图片压缩失败：', error);
        throw new Error('图片压缩失败');
    }
}