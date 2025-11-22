import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

async function saveImageWithThumbnail(fileBuffer: Buffer, filename: string) {
    const uploadDir = path.join(__dirname, '../uploads/images');
    const filePath = path.join(uploadDir, filename);
    const thumbnailPath = path.join(uploadDir, `thumb-${filename}`);

    // 保存原图
    await fs.writeFile(filePath, fileBuffer);

    // 生成缩略图 (宽度 300px，高度等比缩放)
    await sharp(fileBuffer)
        .resize({ width: 300 })
        .toFile(thumbnailPath);

    return {
        image_url: `/uploads/images/${filename}`,
        thumbnail_url: `/uploads/images/thumb-${filename}`
    };
}
