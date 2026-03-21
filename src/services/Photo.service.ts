import { Album, Image, Photo, sequelize } from '@/models/index';
import { Op, Transaction } from 'sequelize';
import { BadRequestError, NotFoundError } from '@/utils/error.util';
import { ImageService } from './Image.service';


/** 
 * 照片服务类
 */
export class PhotoService {
  /** 
   * 根据图片ID删除图片，并删除和IMAGE表的关联关系
   * @param imageId 图片ID
   * @param transaction 数据库事务
   */
  async deletePhotoByImageId(imageId: number, transaction?: Transaction) {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 1. 检查图片是否存在
      const image = await Image.findByPk(imageId, { transaction: useTransaction });
      if (!image) {
        throw new NotFoundError(`图片ID ${imageId} 不存在`);
      }

      // 2. 查找关联的 Photo 记录，以便更新相册计数
      const photo = await Photo.findOne({
        where: { imageId },
        transaction: useTransaction
      });

      if (photo) {
        // 2.1 更新相册照片数量
        const album = await Album.findByPk(photo.albumId, { transaction: useTransaction });
        if (album) {
          await album.decrement('photoCount', { transaction: useTransaction });
        }
        
        // 2.2 删除 Photo 记录 (虽然 Image 删除会级联删除 Photo，但显式删除更清晰，且为了保证逻辑顺序)
        await photo.destroy({ transaction: useTransaction });
      }

      // 3. 删除 Image 记录和物理文件
      // 注意：由于 Photo 表设置了 onDelete: 'CASCADE'，删除 Image 会自动删除 Photo
      // 但上面我们已经显式处理了 Photo，这里再删 Image 也是安全的
      await ImageService.deleteImagesByIds([imageId], useTransaction);

      // 提交事务
      if (!transaction) {
        await useTransaction.commit();
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 创建照片
   * @param albumId 相册ID
   * @param imageId 图片ID
   * @param title 照片标题
   * @param transaction 数据库事务
   * @returns 照片实例
   */
  async createPhoto(albumId: number, imageId: number, title: string | null = null, transaction?: Transaction) {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 检查相册是否存在
      const album = await Album.findByPk(albumId, { transaction: useTransaction });
      if (!album) {
        throw new NotFoundError(`相册ID ${albumId} 不存在`);
      }
      // 检查图片是否存在
      const image = await Image.findByPk(imageId, { transaction: useTransaction });
      if (!image) {
        throw new NotFoundError(`图片ID ${imageId} 不存在`);
      }
      // 检查是否重复添加
      const existPhoto = await Photo.findOne({
        where: {
          albumId,
          imageId
        },
        transaction: useTransaction
      });

      if (existPhoto) {
        return existPhoto;
      }
      // 创建照片
      const photo = await Photo.create({
        albumId,
        imageId,
        title,
        coverStatus: 'none',
        priority: 0
      }, { transaction: useTransaction });

      // 更新相册照片数量
      await album.increment('photoCount', { transaction: useTransaction });

      // 检查是否需要设置封面（如果相册没有封面）
      if (!album.coverPhotoId) {
        // 先提交 photo 的创建，确保 photo.id 已经生成并可用
        // 实际上在同一个事务中是可以直接使用的，但为了确保安全，我们先 update album
        await Album.update(
          { coverPhotoId: photo.id },
          { where: { id: albumId }, transaction: useTransaction }
        );

        // 同时更新 Photo 的 coverStatus
        await photo.update({ coverStatus: 'main' }, { transaction: useTransaction });
      }
        
      // 提交事务
      if (!transaction) {
        await useTransaction.commit();
      }
      return photo;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }
}