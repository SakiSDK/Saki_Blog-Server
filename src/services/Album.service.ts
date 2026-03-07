import { AlbumBrief, AlbumUpdateBody, PhotoInfo, type AlbumListQuery, } from './../schemas/album/album.admin';
import { Album, Image, Photo, sequelize } from '@/models';
import { AlbumFormData } from '@/types/album';
import { Pagination } from '@/types/app';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { buildListQuery } from '@/utils/query.util';
import { Op, Transaction } from 'sequelize';
import { ImageService } from './Image.service';
import { config } from '@/config';
import { type PhotoVo, type AlbumVo } from '@/schemas/album/album.web';


/** web端相册列表查询参数类型 */
export type AlbumListQueryVo = Pick<AlbumListQuery, 'page' | 'pageSize'>

/**
 * 相册服务类
 * --------------------------------------------
 * 相册服务类：处理相册相关的核心业务逻辑，包括相册的创建、查询、更新、删除及封面设置等操作
 * 
 * 职责：封装相册业务规则、数据校验、与数据模型交互，确保业务流程的完整性和数据一致性
 */
export class AlbumService {
  /** 
   * 创建相册
   * @param data - 相册创建表单数据（包含name等必填字段，及description等可选字段）
   * @returns 创建成功的相册实例
   * @description 校验相册名称和生成的别名（slug）唯一性，避免重复创建，最终创建相册记录并返回
   */
  public static async createAlbum(data: AlbumFormData, transaction?: Transaction): Promise<Album> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      const existingAlbumByName = await Album.findOne({
        where: { name: data.name },
        transaction: useTransaction,
      })
      if (existingAlbumByName) {
        throw new BadRequestError('相册名称已存在，请更换名称')
      }
      const slug = Album.generateSlug(data.name);
      const existingAlbumBySlug = await Album.findOne({
        where: { slug },
        transaction: useTransaction,
      })
      if (existingAlbumBySlug) {
        // 如果slug重复
        throw new BadRequestError('相册别名已存在，请更换别名')
      }
    
      const album = await Album.create({
        ...data,
        slug,
        photoCount: 0,
      }, {
        transaction: useTransaction,
      })

      if (!transaction) {
        await useTransaction.commit();
      }

      return album;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      
      // 抛出错误，统一到 Controller 层处理错误
      throw error;
    }
  }

  /** 
   * 获取相册列表
   * @param query - 查询参数，包含分页、排序等选项
   * @returns 包含相册列表和分页信息的对象
   * @description 根据查询参数分页查询相册记录，返回相册列表和分页详情（当前页、总页数、总记录数等）
   */
  public static async getAlbumList(query: Partial<AlbumListQuery>): Promise<{ list: AlbumBrief[], pagination: Pagination }> {

    const {where, order, offset, page, pageSize} = buildListQuery(query, {
      searchFields: ['name', 'title', 'description'],
      exactFields: [],
    })

    const { count, rows } = await Album.findAndCountAll({
      where,
      attributes: [
        'id',
        'name',
        'title',
        'description',
        'coverPhotoId',
        'photoCount',
        'priority',
        'createdAt',
      ],
      include: [
        {
          model: Photo,
          as: 'coverPhoto',
          attributes: ['id'],
          include: [
            {
              model: Image,
              as: 'image',
              attributes: ['path'],
            },
          ],
        },
      ],
      order: order as any,
      offset,
      limit: pageSize,
    })

    // 格式化返回数据
    const list = await Promise.all(rows.map(async (album) => {
      const plain = album.get({plain: true}) as Album & {
        coverPhoto?: Photo & {
          image?: Image & {
            path?: string
          }
        }
      }

      let cover = '';
      let thumbCover = '';

      if (plain.coverPhoto?.image?.path) {
        // 获取缩略图 URL
        thumbCover = await ImageService.getThumbUrl(plain.coverPhoto.image.path);
        // 获取原图 URL
        let imagePath = plain.coverPhoto.image.path;
        // 规范化路径：移除可能存在的 /uploads/ 前缀，避免重复拼接
        if (imagePath.startsWith('/uploads/')) {
          imagePath = imagePath.substring(9);
        } else if (imagePath.startsWith('uploads/')) {
          imagePath = imagePath.substring(8);
        }
        imagePath = imagePath.replace(/^\/+/, '');
        
        cover = `${config.serverUrl}/uploads/${imagePath}`;
      }

      return {
        id: plain.id,
        name: plain.name,
        title: plain.title ?? '',
        description: plain.description,
        cover,
        thumbCover,
        photoCount: plain.photoCount,
        priority: plain.priority,
        creator: plain.creator,
        coverPhotoId: plain.coverPhotoId,
        createdAt: plain.createdAt,
      }
    }))

      // 格式化分页信息
      const pagination: Pagination = {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }

      return { list, pagination };
  }

  /** 
   * 获取相册列表
   * @description 根据查询参数分页查询相册记录，返回相册列表和分页详情（当前页、总页数、总记录数等）
   * @param query - 查询参数，包含分页、排序等选项
   * @group web - 相册管理
   * @returns 包含相册列表和分页信息的对象
   */
  public static async getAlbumListForWeb(
    query: AlbumListQueryVo,
    transaction?: Transaction,
  ): Promise<{
    list: AlbumVo[],
    pagination: Pagination
  }> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      const { page, pageSize } = query;
      const offset = (page - 1) * pageSize;
      const { count, rows } = await Album.findAndCountAll({
        attributes: [
            'slug',
            'name',
            'title',
            'description',
        ],
        where: {
          status: 'public'
        },
        include: [
          {
            model: Photo,
            as: 'coverPhoto',
            attributes: ['id'],
            include: [
              {
                model: Image,
                as: 'image',
                attributes: ['path'],
              },
            ],
          },
        ],
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        offset,
        limit: pageSize,
      })

      // 格式化返回数据
      const list = await Promise.all(rows.map(async (album) => {
        const plain = album.get({plain: true}) as Album & {
          coverPhoto?: Photo & {
            image?: Image & {
              path?: string
            }
          }
        }

        let cover = '';
        let thumbCover = '';

        if (plain.coverPhoto?.image?.path) {
          // 获取缩略图 URL
          thumbCover = await ImageService.getThumbUrl(plain.coverPhoto.image.path);
          // 获取原图 URL
          let imagePath = plain.coverPhoto.image.path;
          // 规范化路径：移除可能存在的 /uploads/ 前缀，避免重复拼接
          if (imagePath.startsWith('/uploads/')) {
            imagePath = imagePath.substring(9);
          } else if (imagePath.startsWith('uploads/')) {
            imagePath = imagePath.substring(8);
          }
          imagePath = imagePath.replace(/^\/+/, '');
          
          cover = `${config.serverUrl}/uploads/${imagePath}`;
        }

        return {
          slug: plain.slug,
          name: plain.name,
          title: plain.title ?? '',
          description: plain.description ?? '',
          cover: cover? cover: thumbCover
        }
      }))

      // 格式化分页信息
      const pagination: Pagination = {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }

      if (!transaction) {
        await useTransaction.commit();
      }

      return {
        list,
        pagination
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 更新相册
   * @param id - 相册ID
   * @param data - 更新数据
   */
  public static async updateAlbum(id: number, data: Partial<AlbumUpdateBody>, transaction?: Transaction): Promise<Album> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      const album = await Album.findByPk(id, { transaction: useTransaction });
      if (!album) {
        throw new NotFoundError(`相册不存在: ${id}`);
      }

      const updates: any = {};
      
      // 更新名称和 Slug
      if (data.name && data.name !== album.name) {
        // 检查名称重复
        const exists = await Album.findOne({
          where: {
            name: data.name,
            id: { [Op.ne]: id }
          },
          transaction: useTransaction
        });
        if (exists) {
          throw new BadRequestError(`相册名称已存在: ${data.name}`);
        }
        
        const slug = Album.generateSlug(data.name);
        const slugExists = await Album.findOne({
            where: {
                slug,
                id: { [Op.ne]: id }
            },
            transaction: useTransaction
        });
        if (slugExists) {
          throw new BadRequestError(`相册别名已存在: ${slug}`);
        }
        updates.name = data.name;
        updates.slug = slug;
      }

      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.status !== undefined) updates.status = data.status;
      if (data.priority !== undefined) updates.priority = data.priority;

      // 更新封面
      if (data.coverPhotoId !== undefined && data.coverPhotoId !== null && data.coverPhotoId !== album.coverPhotoId) {
        // 检查photo是否存在
        const photo = await Photo.findByPk(data.coverPhotoId, { transaction: useTransaction });
        if (!photo) {
          throw new NotFoundError(`封面图片不存在: ${data.coverPhotoId}`);
        }
        // 确保照片属于该相册（可选，根据业务需求）
        if (photo.albumId !== id) {
           // 如果封面不属于当前相册，是否允许？
           // 既然是设置相册封面，通常应该是相册内的图片。
           // 但如果允许跨相册引用，也可以。
           // 这里我们加上限制，更安全。
          throw new BadRequestError('封面图片必须属于该相册');
        }
        updates.coverPhotoId = data.coverPhotoId;
      }

      console.log(updates);

      await album.update(updates, { transaction: useTransaction });

      if (!transaction) {
        await useTransaction.commit();
      }
      
      console.log(album);
      return album;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /** 
   * 获取指定相册内的所有图片
   * @param id - 相册ID
   * @group admin - 相册管理
   * @returns 相册内的所有图片列表（包含缩略图和原图URL）
   */
  public static async getPhotosInAlbum(id: number, transaction?: Transaction): Promise<PhotoInfo[]> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      // 校验相册是否存在
      const album = await Album.findByPk(id, { transaction: useTransaction });
      if (!album) {
        throw new NotFoundError(`相册不存在: ${id}`);
      }
      // 查询照片及关联图片
      const photos = await Photo.findAll({
        where: { 
          albumId: id,
        },
        include: [{
          model: Image,
          as: 'image',
          attributes: ['id', 'path', 'width', 'height', 'type', 'size']
        }],
        order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        transaction: useTransaction,
      });

      // 构建返回结果（添加 URL）
      const result = await Promise.all(photos.map(async (photo) => {
        // const photoJson = photo.toJSON() as any;
        const image = (photo as any).image;
        
        let originalUrl = '';
        let thumbnailUrl = '';

        if (image && image.path) {
          // 构建原图 URL
          if (image.path.startsWith('http')) {
            originalUrl = image.path;
          } else {
            let cleanPath = image.path.replace(/\\/g, '/');
            if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
            originalUrl = `${config.serverUrl}/${cleanPath}`;
          }
          
          // 获取缩略图 URL
          thumbnailUrl = await ImageService.getThumbUrl(image.path);
        }

        return {
          id: photo.id,
          originalUrl,
          thumbnailUrl,
          fileSize: image?.size,
          width: image?.width,
          height: image?.height,
          createdAt: photo.createdAt,
        };
      }));

      if (!transaction) {
        await useTransaction.commit();
      }

      return result;
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /** 
   * 通过相册别名获取相册内的所有图片
   * @param slug - 相册别名
   * @group web - 相册管理
   * @returns 相册内的所有图片列表（包含缩略图和原图URL）
   */
  public static async getPhotosInAlbumBySlug(
    slug: Album['slug'],
    query: Pick<AlbumListQuery, 'page' | 'pageSize'>,
    transaction?: Transaction
  ): Promise<{
    album: Omit<AlbumVo, 'cover'>;
    list: PhotoVo[];
    pagination: Pagination;
  }> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      const { page, pageSize } = query;
      const offset = (page - 1) * pageSize;

      // 校验相册是否存在
      const album = await Album.findOne({
        where: {
          slug,
          status: 'public'
        },
        attributes: [
          'id',
          'slug',
          'name',
          'title',
          'description',
        ],
        transaction: useTransaction,
      });
      if (!album) {
        throw new NotFoundError(`相册不存在: ${slug}`);
      }

      const albumId = album.id;

      // 查询照片及关联图片
      const { rows: photos, count } = await Photo.findAndCountAll({
        where: { albumId },
        limit: pageSize,
        offset,
        include: [{
          model: Image,
          as: 'image',
          attributes: ['width', 'height', 'path']
        }],
        order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        transaction: useTransaction,
      });

      // 构建返回结果（添加 URL）
      const list = await Promise.all(photos.map(async (photo) => {
        const image = (photo as any).image;
        
        let originalUrl = '';
        let thumbnailUrl = '';

        if (image && image.path) {
          // 构建原图 URL
          if (image.path.startsWith('http')) {
            originalUrl = image.path;
          } else {
            let cleanPath = image.path.replace(/\\/g, '/');
            if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
            originalUrl = `${config.serverUrl}/${cleanPath}`;
          }
          
          // 获取缩略图 URL
          thumbnailUrl = await ImageService.getThumbUrl(image.path);
        }

        return {
          originalUrl,
          thumbnailUrl,
          width: image?.width,
          height: image?.height,
        };
      }));

      // 格式化分页信息
      const pagination: Pagination = {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      }

      const formateAlbum = album.get({ plain: true });

      if (!transaction) {
        await useTransaction.commit();
      }

      return {
        album: {
          slug: formateAlbum.slug,
          name: formateAlbum.name ?? '',
          title: formateAlbum.title ?? '',
          description: formateAlbum.description ?? '',
        },
        list,
        pagination,
      };
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      throw error;
    }
  }

  /** 
   * 删除相册
   * @param ids - 相册ID列表，用于指定要删除的相册
   * @description 校验相册是否存在，若存在则删除相册记录，同时更新关联的照片计数
   */
  public static async deleteAlbums(ids: Album['id'][], transaction?: Transaction): Promise<void> {
    const useTransaction = transaction || await sequelize.transaction();
    try {
      const albums = await Album.findAll({
        where: { id: { [Op.in]: ids } },
        transaction: useTransaction,
      })
      if (albums.length !== ids.length) {
        throw new BadRequestError('有相册不存在')
      }

      // 2. 查找相册下的所有照片
      const photos = await Photo.findAll({
        where: { albumId: { [Op.in]: ids } },
        attributes: ['id'],
        transaction: useTransaction,
      });
      const photoIds = photos.map(p => p.id);

      // 3. 删除照片及其关联的图片 (调用 Photo.deletePhotos)
      if (photoIds.length > 0) {
        await Photo.deletePhotos(photoIds, useTransaction);
      }

      // 4. 删除相册记录
      await Album.destroy({
        where: { id: { [Op.in]: ids } },
        transaction: useTransaction,
      })

      if (!transaction) {
        await useTransaction.commit();
      }
    } catch (error) {
      if (!transaction) {
        await useTransaction.rollback();
      }
      
      // 抛出错误，统一到 Controller 层处理错误
      throw error;
    }
  }
}