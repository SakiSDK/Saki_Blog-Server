import { Album, Image, Photo, sequelize } from '@/models/index';
import { Op, Transaction } from 'sequelize';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { ImageService } from './Image.service';


/** 
 * 照片服务类
 */
export class PhotoService {
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
        await album.update({
          coverPhotoId: photo.id,
        }, { transaction: useTransaction });

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