import { Photo, Album } from "../models/index";
import { Op, Transaction } from "sequelize";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { sequelize } from "../models/index";
import { deleteLocalFile } from "../utils/file";

export interface PhotoQueryParams {
    album_id?: number | null;
    title?: string | null;
    description?: string | null;
    format?: string | null;
    is_cover?: boolean;
    min_size?: number | null;
    max_size?: number | null;
    page?: number;
    limit?: number;
    order_by?: 'created_at' | 'updated_at' | 'size' | 'width' | 'height';
    sort?: 'ASC' | 'DESC';
}

/**
 * 照片服务类：处理照片相关的核心业务逻辑，包括照片的创建、查询、更新、删除及封面设置等操作
 * 
 * 职责：封装照片业务规则、数据校验、事务管理，与数据模型交互确保数据一致性
 */
export class PhotoService {
    /**
     * 批量创建照片
     * @param data - 包含相册ID和照片数组的对象（照片信息包括路径、尺寸、格式等）
     * @returns 创建成功的照片实例数组
     * @description 校验目标相册是否存在，批量创建照片记录，自动更新相册的照片数量（通过事务保证数据一致性）
     */
    public static async createPhotos(data: {
        album_id: number;
        photos: Array<{
            title?: string;
            description?: string;
            image_path: string;
            thumbnail_path: string;
            size: number;   // 单位：KB
            width: number;  // 单位：px
            height: number; // 单位：px
            format: string; // 小写格式（jpg/png等）
            uploader: string;
        }>;
    }) {
        const transaction: Transaction = await sequelize?.transaction({
            isolationLevel:  Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const album = await Album.findByPk(data.album_id, {
                transaction
            })
            if (!album) {
                throw new NotFoundError('要上传的相册不存在或已被删除');
            }
            const photoDataList = data.photos.map(photo => ({
                album_id: data.album_id,
                title: photo.title || null,
                description: photo.description || null,
                image_path: photo.image_path,
                thumbnail_path: photo.thumbnail_path || null,
                size: photo.size,
                width: photo.width,
                height: photo.height,
                format: photo.format.toLowerCase(),
                uploader: photo.uploader,
                is_cover: false,
            }))
            const createdPhotos = await Photo.bulkCreate(photoDataList, {
                transaction,
            })
            // 自动更新相册图片数
            await Album.updatePhotoCount(data.album_id, createdPhotos.length, transaction)
            transaction.commit();
            return createdPhotos;
        } catch (error) {
            // 如果发生错误，回滚事务
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * 获取照片列表（支持多条件筛选、分页、排序）
     * @param params - 照片查询参数（包含筛选条件、分页信息、排序规则）
     * @returns 照片列表及分页信息（照片数组、总数、当前页、每页条数、总页数）
     * @description 根据传入的筛选条件构建查询，支持按相册、标题、格式等筛选，返回分页后的照片数据
     */
    public static async getPhotoList(params: PhotoQueryParams) {
        const {
            album_id,
            title,
            description,
            format,
            is_cover,
            min_size,
            max_size,
            page = 1,
            limit = 10,
            order_by = 'created_at',
            sort = 'DESC'
        } = params;
        const offset = (page - 1) * limit;
        const whereConditions: any = {};
        if (album_id) {
            whereConditions.album_id = album_id;
        }
        if (title) {
            whereConditions.title = { [Op.like]: `%${title}%` };
        }
        if (is_cover) {
            whereConditions.is_cover = is_cover;
        }
        if (description) {
            whereConditions.description = { [Op.like]: `%${description}%` };
        }
        if (format) {
            whereConditions.format = format;
        }
        if (min_size) {
            whereConditions.size = { [Op.gte]: min_size };
        }
        if (max_size) {
            whereConditions.size = { [Op.lte]: max_size };
        }
        const photos = await Photo.findAndCountAll({
            where: whereConditions,
            offset,
            limit,
            order: [[order_by, sort]],
            attributes: {
                exclude: []
            }
        })
        return {
            photos: photos.rows,
            total: photos.count,
            page,
            pageSize: limit,
            totalPages: Math.ceil(photos.count / limit),
        }
    }

    /**
     * 更新照片信息
     * @param id - 要更新的照片ID
     * @param data - 包含更新字段的数据（标题、描述、目标相册ID等可选字段）
     * @returns 更新后的照片实例
     * @description 支持更新照片的基本信息，若更换相册则同步更新新旧相册的照片数量（通过事务保证一致性）
     */
    public static async updatePhoto(id: number, data: {
        title?: string,
        description?: string,
        album_id?: number,
    }) {
        const transaction = await sequelize.transaction({
            isolationLevel:  Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            console.log(data)
            const photo = await Photo.findByPk(id, { transaction });
            if (!photo) {
                throw new NotFoundError('照片不存在');
            }
            const updateData: Record<string, any> = {};
            if (data.title) updateData.title = data.title;
            if (data.description) updateData.description = data.description;
            if (data.album_id) {
                const album = await Album.findByPk(data.album_id, {
                    transaction
                })
                if (!album) throw new NotFoundError('更换的相册不存在');
                // 更新新相册计数
                await Album.updatePhotoCount(album.id, 1, transaction);
                // 更新旧相册计数
                await Album.updatePhotoCount(photo.album_id, -1, transaction);
                updateData.album_id = data.album_id;
            }
            const updatedPhoto = await photo.update(updateData, {
                transaction
            })
            // 提交事务
            await transaction.commit();
            return updatedPhoto;
        } catch (error) {
            // 回滚事务
            transaction.rollback();
            throw error;
        }
    }

    /**
     * 删除照片
     * @param id - 要删除的照片ID
     * @returns 包含删除成功消息的对象
     * @description 检查照片是否存在，若为封面则自动更换相册封面，更新相册照片数，删除本地文件（通过事务保证数据一致性）
     */
    static async deletePhoto(id: number): Promise<{ message: string }> {
        const transaction = await sequelize.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });
        // 待删除的原图和缩略图
        let image_path: string | null = null;
        let thumbnail_path: string | null = null;
        try {
            const photo = await Photo.findByPk(id, {
                transaction
            });
            if (!photo) {
                throw new NotFoundError('要删除的图片不存在或已被删除');
            }
            const photoTitle: string = photo.title || '';
            image_path = photo.image_path || null;
            thumbnail_path = photo.thumbnail_path || null;
            const album = await Album.findByPk(photo.album_id, {
                transaction
            });
            if(!album) {
                throw new NotFoundError('图片所属相册不存在或已被删除');
            }
            // 判断是否是相册封面
            if (photo.is_cover) {
                const newCoverPhoto = await Photo.findOne({
                    where: {
                        album_id: photo.album_id,
                        is_cover: true
                    },
                    transaction,
                });
                if (newCoverPhoto) {
                    await newCoverPhoto.update({ is_cover: true }, { transaction });
                    await album.update({
                        cover_photo_id: newCoverPhoto.id || null,
                        cover_photo_url: newCoverPhoto.image_path || null,
                        cover_photo_thumbnail_url: newCoverPhoto.thumbnail_path || null,
                    }, {
                        transaction
                    });
                } else {
                    await album.update({
                        cover_photo_id: null,
                        cover_photo_url: null,
                        cover_photo_thumbnail_url: null,
                    }, {
                        transaction
                    });
                }
            }

            await Album.updatePhotoCount(photo.album_id, -1, transaction);
            await photo.destroy({ transaction });
            // 提交事务
            transaction.commit();
            if (image_path) {
                await deleteLocalFile(image_path);
            }
            if (thumbnail_path) {
                await deleteLocalFile(thumbnail_path);
            }
            return {
                message: `标题为${photoTitle}的图片删除成功`,
            }
        } catch (error: any) {
            transaction.rollback();
            console.error(`[PhotoService.deletePhoto]图片删除失败: `, error);
            throw new Error(error.message || '图片删除失败');
        }
    }
    
    /**
     * 获取照片详情
     * @param id - 照片ID
     * @returns 照片实例
     * @description 根据ID查询单张照片的详细信息，若照片不存在则抛出异常
     */
    static async getPhotoDetail(id: number): Promise<Photo> {
        const photo = await Photo.findByPk(id);
        if (!photo) {
            throw new NotFoundError('图片不存在或已被删除');
        }
        return photo;
    }

    /**
     * 设置照片为相册封面
     * @param photoId - 要设为封面的照片ID
     * @returns 包含成功消息和照片数据的对象
     * @description 校验照片和所属相册是否存在，取消原封面状态，更新新封面信息（通过事务保证原子性）
     */
    static async setCoverPhoto(photoId: number){
        return sequelize.transaction(async (t) => {
            const newCover = await Photo.findByPk(photoId, { transaction: t });
            if (!newCover) {
                throw new NotFoundError('图片不存在或已被删除');
            }
            if (newCover.is_cover) {
                throw new BadRequestError('该图片已经是封面');
            }
            const album = await Album.findOne({
                where: { id: newCover.album_id },
                transaction: t,
            });
            if (!album) {
                throw new NotFoundError('相册不存在或已被删除');
            }
            // 检查相册是否有封面
            if (album?.cover_photo_id) {
                console.log('相册有封面')
                await Photo.update({
                    is_cover: false,
                }, {
                    where: { id: album.cover_photo_id },
                    transaction: t,
                });
            }
            
            // 更新图片为封面
            await album.update({
                cover_photo_id: newCover.id,
                cover_photo_url: newCover.image_path as string,
                cover_photo_thumbnail_url: newCover.thumbnail_path as string,
            }, {
                transaction: t,
            });
            await newCover.update({ is_cover: true }, { transaction: t });
            return {
                message: '设置封面成功',
                data: newCover,
            }
        })
    }

    /**
     * 根据相册ID获取所有照片
     * @param albumId - 相册ID
     * @returns 照片实例数组
     * @description 查询指定相册下的所有照片（无分页，返回全部）
     */
    public static async getPhotosByAlbumId(albumId: number): Promise<Photo[]> {
        const photos = await Photo.findAll({
            where: {
                album_id: albumId,

            },
            attributes: {
                exclude: ['thumbnail_path', 'format', 'uploader', 'is_cover', 'updated_at']
            },
            order: [['created_at', 'DESC']]
        });
        return photos;
    }
}