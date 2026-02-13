export interface AlbumAttributes {
    /** 相册ID */
    /** 相册名称 */
    id: number;
    name: string;
    /** 相册标题 */
    title: string | null;
    /** 相册slug */
    slug: string;
    /** 相册描述 */
    description?: string | null;
    /** 相册封面图片ID */
    coverPhotoId?: number | null;
    /** 相册封面图片URL */
    coverPhotoUrl?: string | null;
    /** 相册封面图片缩略图URL */
    coverPhotoThumbnailUrl?: string | null;
    /** 相册照片数量 */
    photoCount: number;
    /** 创建时间 */
    createdAt: Date;
    /** 更新时间 */
    updatedAt: Date;
    /** 创建者 */
    creator: string;
}

export interface AlbumCreationAttributes
    extends Optional<
        AlbumAttributes,
        'id' | 'slug' | 'coverPhotoId' | 'coverPhotoUrl' | 'coverPhotoThumbnailUrl' | 'createdAt' | 'updatedAt' | 'creator'
    > { }

export interface AlbumQueryParams {
    /** 相册ID */
    id?: number;
    /** 相册名称 */
    name?: string;
    /** 相册标题 */
    title?: string | null;  
    /** 相册slug */
    slug?: string;
    /** 相册描述 */    
    description?: string | null;
    /** 分页页码 */
    page?: number;
    /** 分页每页数量 */
    limit?: number;
    /** 排序字段 */
    orderBy?: 'createdAt' | 'photoCount' | 'updatedAt';
    /** 排序方向 */
    sort?: 'ASC' | 'DESC';
}

export interface AlbumFormData {
    /** 相册名称 */
    name: string;
    /** 相册slug */
    slug: string;
    /** 相册标题 */
    title: string;
    /** 相册描述 */
    description?: string;
    /** 相册封面图片ID */
    coverPhotoId?: number;
    /** 相册封面图片URL */
    coverPhotoUrl?: string | null;
}

// 相册更新参数（部分字段可更新）
export interface AlbumUpdateData {
    /** 相册名称 */
    name?: string;
    /** 相册标题 */
    title?: string;
    /** 相册描述 */
    description?: string | null;
    /** 相册封面图片ID */
    coverPhotoId?: number | null;
    /** 相册封面图片URL */
    coverPhotoUrl?: string | null;
}