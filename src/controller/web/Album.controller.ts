import { AlbumService } from '@/services/Album.service';
import { Request, Response } from 'express';


export class AlbumController {
  /**
   * @description：通过相册slug别名获取相册内的所有图片
   * GET /web/album/:slug/photos
   */
  public static async getPhotosInAlbumBySlug(req: Request, res: Response) {
    try {
      const slug = req.params.slug as string;
      const { page = 1, pageSize = 10 } = req.query;
      const { list, pagination, album } = await AlbumService.getPhotosInAlbumBySlug(slug, {
        page: Number(page),
        pageSize: Number(pageSize),
      });
      res.status(200).json({
        code: 200,
        message: '相册内图片获取成功',
        success: true,
        data: {
          album,
          list,
          pagination,
        },
      });
    } catch (error: any) {
      console.error('相册内图片获取失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册内图片获取失败',
        success: false,
        data: null,
      });
    }
  }

  /** 
   * @description: 获取相册列表
   * GET /web/album
   */
  public static async getAlbumList(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const { list, pagination } = await AlbumService.getAlbumListForWeb({
        page: Number(page),
        pageSize: Number(pageSize),
      });
      res.status(200).json({
        code: 200,
        message: '相册列表获取成功',
        success: true,
        data: {
          list,
          pagination,
        },
      });
    } catch (error: any) {
      console.error('相册列表获取失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册列表获取失败',
        success: false,
        data: null,
      });
    }
  }
} 