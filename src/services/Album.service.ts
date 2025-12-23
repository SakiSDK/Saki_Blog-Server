// import { Album } from "../models/index";
// import { AlbumAttributes, AlbumFormData, AlbumQueryParams, AlbumUpdateData } from "../types/album";
// import { Op } from "sequelize";
// import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors'
// import { Photo } from "../models/Photo.model";

// /**
//  * 相册服务类
//  * --------------------------------------------
//  * 相册服务类：处理相册相关的核心业务逻辑，包括相册的创建、查询、更新、删除及封面设置等操作
//  * 
//  * 职责：封装相册业务规则、数据校验、与数据模型交互，确保业务流程的完整性和数据一致性
//  */
// export class AlbumService { 
//     /**
//      * 创建相册
//      * @param data - 相册创建表单数据（包含name等必填字段，及description等可选字段）
//      * @returns 创建成功的相册实例
//      * @description 校验相册名称和生成的别名（slug）唯一性，避免重复创建，最终创建相册记录并返回
//      */
//     public static async createAlbum(data: AlbumFormData): Promise<Album> {
//         const existingAlbumByName = await Album.findOne({
//             where: { name: data.name }
//         })
//         if (existingAlbumByName) {
//             throw new BadRequestError('相册名称已存在，请更换名称')
//         }
//         const slug = data.slug || Album.generateSlug(data.name);
//         const existingAlbumBySlug = await Album.findOne({
//             where: { slug }
//         })
//         if (existingAlbumBySlug) {
//             // 如果slug重复
//             throw new BadRequestError('相册别名已存在，请更换别名')
//         }
//         const album = await Album.create({
//             ...data,
//             slug,
//             description: data.description || null,
//             photo_count: 0,
//             cover_photo_id: data.cover_photo_id || null,
//             cover_photo_url: data.cover_photo_url || null,
//         })
//         return album;
//     }

//     /**
//      * 获取相册详情
//      * @param id - 相册ID
//      * @returns 相册实例
//      * @description 根据ID查询相册详情，若相册不存在或已删除则抛出异常
//      */
//     public static async getAlbumDetail(id: number): Promise<Album> {
//         const album = await Album.findByPk(id);
//         if (!album) {
//             throw new NotFoundError('要查询的相册不存在或已被删除');
//         }
//         return album;
//     }

//     /**
//      * 获取相册列表（支持筛选、分页、排序）
//      * @param query - 查询参数（包含筛选条件、分页信息、排序规则）
//      * @returns 相册列表及分页信息（相册数组、总数、当前页、每页条数、总页数）
//      * @description 处理默认参数，构建多条件筛选条件，通过分页和排序查询相册列表
//      */
//     public static async getAlbumList(query: AlbumQueryParams): Promise<{
//         albums: Album[],
//         total: number
//         page: number,
//         pageSize: number,
//         totalPages: number
//     }> {
//         const {
//             id,
//             name,
//             title,
//             slug,
//             description,
//             page = 1,
//             limit = 10,
//             order_by = 'created_at',
//             sort = 'DESC'
//         } = query
//         const offset = (page - 1) * limit
//         const whereConditions: any = {}
//         if (id) {
//             whereConditions.id = id
//         }
//         if (name) {
//             whereConditions.name = { [Op.like]: `%${name}%` }
//         }
//         if (title) {
//             whereConditions.title = { [Op.like]: `%${title}%` }
//         }
//         if (slug) {
//             whereConditions.slug = { [Op.like]: `%${slug}%` }
//         }
//         if (description) {
//             whereConditions.description = { [Op.like]: `%${description}%` }
//         }
//         const { rows, count } = await Album.findAndCountAll({
//             where: whereConditions,
//             offset,
//             limit,
//             order: [[order_by, sort]],
//             attributes: {
//                 exclude: [] // 默认影藏的字段
//             }
//         })
//         return {
//             albums: rows,
//             total: count,
//             page,
//             pageSize: limit,
//             totalPages: Math.ceil(count / limit),
//         }
//     }

//     /**
//      * 更新相册信息
//      * @param id - 要更新的相册ID
//      * @param data - 包含更新字段的数据（name、description等可选字段）
//      * @returns 更新后的相册实例
//      * @description 检查相册是否存在，若更新名称则重新生成并校验slug唯一性，最终执行更新
//      */
//     public static async updateAlbum(id: number, data: AlbumUpdateData): Promise<Album>{
//         // 检查当前相册是否存在
//         const album = await Album.findByPk(id);
//         if (!album) {
//             throw new NotFoundError('相册不存在')
//         }
//         // 检查相册名称是否被占用
//         let updateData: any = { ...data }
//         if (data.name && data.name !== album.name) {
//             const existingAlbum = await Album.findOne({
//                 where: {
//                     name: data.name,
//                     id: { [Op.ne]: id }// 排除当前相册
//                 }
//             });
//             if (existingAlbum) {
//                 throw new BadRequestError('相册名称已存在');
//             }
//             const newSlug = Album.generateSlug(data.name);
//             const existingSlug = await Album.findOne({
//                 where: {
//                     slug: newSlug,
//                     id: { [Op.ne]: id }// 排除当前相册
//                 }
//             });
//             if (existingSlug) {
//                 throw new BadRequestError('更新后的名称生成的别名已存在，请调整名称');
//             }
//             updateData.slug = newSlug;
//         }
//         await album.update(updateData);
//         return album;
//     }

//     /**
//      * 删除相册
//      * @param id - 要删除的相册ID
//      * @returns 包含删除成功消息的对象
//      * @description 检查相册是否存在，若相册下有关联照片则禁止删除，否则执行删除操作
//      */
//     public static async deleteAlbum(id: number): Promise<{ message: string}> { 
//         // 先检查相册是否存在
//         const album = await Album.findByPk(id)
//         if (!album) {
//             throw new NotFoundError('要删除的相册不存在或已被删除')
//         }
//         // 检查相册下是否有相片(如果有就不允许删除)
//         const photoCount = await Photo.count({ where: { album_id: id } })
//         if (photoCount > 0) {
//             throw new BadRequestError(`该相册下有${photoCount}相片，请先删除所有相片再删除相册`)
//         }
//         const albumName = album.name;
//         // 执行删除
//         await album.destroy()
//         return { message: `成功删除相册(${albumName})` }
//     }

//     /**
//      * 设置相册封面
//      * @param albumId - 相册ID
//      * @param photoId - 作为封面的照片ID
//      * @param photoUrl - 作为封面的照片URL
//      * @returns 更新后的相册实例
//      * @description 校验照片是否存在且属于目标相册、相册是否存在，更新相册封面信息及照片的封面标识
//      */
//     static async setAlbumCover(albumId: number, photoId: number, photoUrl: string): Promise<Album> {
//         // 检查目标照片是否存在并属于该相册
//         const photo = await Photo.findByPk(photoId)
//         if (!photo || photo.album_id !== albumId) {
//             throw new NotFoundError('该相片不存在或不属于当前相册，无法设为封面')
//         }
//         // 检查相册是否存在
//         const album = await Album.findByPk(albumId)
//         if (!album) {
//             throw new NotFoundError('该相册不存在')
//         }
//         // 更新相册的封面信息
//         await album.update({ cover_photo_id: photoId, cover_photo_url: photoUrl })
//         // 更新照片的is_cover字段
//         await photo.update({ is_cover: true })
//         return album;
//     }
// }