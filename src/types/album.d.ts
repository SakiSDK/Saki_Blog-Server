export interface AlbumAttributes {
    id: number;
    name: string;
    title: string | null;
    slug: string;
    description?: string | null;
    cover_photo_id?: number | null;
    cover_photo_url?: string | null;
    cover_photo_thumbnail_url?: string | null;
    photo_count: number;
    created_at: Date;
    updated_at: Date;
    creator: string;
}

export interface AlbumCreationAttributes
    extends Optional<
        AlbumAttributes,
        'id' | 'slug' | 'cover_photo_id' | 'cover_photo_url' | 'created_at' | 'updated_at' | 'creator'
    > { }

export interface AlbumQueryParams {
    id?: number;
    name?: string;
    title?: string | null;
    slug?: string;
    description?: string | null;
    page?: number;
    limit?: number;
    order_by?: 'created_at' | 'photo_count' | 'updated_at';
    sort?: 'ASC' | 'DESC';
}

export interface AlbumFormData {
    name: string;   // 相册名称
    slug: string;   // 相册slug
    title: string;  // 相册标题
    description?: string; // 相册描述
    cover_photo_id?: number; // 相册封面图片ID
    cover_photo_url?: string | null;
}

// 相册更新参数（部分字段可更新）
export interface AlbumUpdateData {
    name?: string;
    title?: string;
    description?: string | null;
    cover_photo_id?: number | null;
    cover_photo_url?: string | null;
}