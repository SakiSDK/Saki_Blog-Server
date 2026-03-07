import { AlbumService } from '@/services/Album.service';
import { Request, Response } from 'express';


export class AlbumController {
  /**
   * @description: 创建相册
   * POST /admin/album/
   */
  public static async createAlbum(req: Request, res: Response) {
    try {
      console.log(req.body);
      const { name, title, description, status } = req.body;
      const album = await AlbumService.createAlbum({
        name, title, description, status
      });
      res.status(200).json({
        code: 200,
        message: '相册创建成功',
        success: true,
        data: album,
      });
    } catch (error: any) {
      console.error('相册创建失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册创建失败',
        success: false,
        data: null,
      });
    }
  }

  /**
   * @description: 获取相册列表
   * GET /admin/album/
   */
  public static async getAlbumList(req: Request, res: Response) {
    try {
      const query = req.query;
      const { list, pagination } = await AlbumService.getAlbumList(query as any);
      res.status(200).json({
        code: 200,
        message: '相册列表获取成功',
        success: true,
        data: {
          list,
          pagination: {
            ...pagination,
            hasPrev: pagination.page > 1,
            hasNext: pagination.page < pagination.totalPages,
          },
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

  /** 
   * @description: 通过相册ID获取相册内的所有图片
   * GET /admin/album/:id/photos
   */
  public static async getPhotosInAlbum(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const photos = await AlbumService.getPhotosInAlbum(Number(id));
      res.status(200).json({
        code: 200,
        message: '相册内图片获取成功',
        success: true,
        data: photos,
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
   * @description: 更新相册
   * PUT /admin/album/:id
   */
  public static async updateAlbum(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, title, description, priority, coverPhotoId, status } = req.body;
      console.log(req.body);
      const album = await AlbumService.updateAlbum(Number(id), {
        name, title, description, priority, status, coverPhotoId
      });
      res.status(200).json({
        code: 200,
        message: '相册更新成功',
        success: true,
        data: album,
      });
    } catch (error: any) {
      console.error('相册更新失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册更新失败',
        success: false,
        data: null,
      });
    }
  }

  /** 
   * @description: 删除相册
   * DELETE /admin/album/:id
   */
  public static async deleteAlbums(req: Request, res: Response) {
    try {
      const { ids } = req.query as any;
      await AlbumService.deleteAlbums(ids.map(Number));
      res.status(200).json({
        code: 200,
        message: '相册删除成功',
        success: true,
        data: null,
      });
    } catch (error: any) {
      console.error('相册删除失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册删除失败',
        success: false,
        data: null,
      });
    }
  }

  /** 
   * @description: 删除单个相册
   * DELETE /admin/album/:id
   */
  public static async deleteAlbum(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AlbumService.deleteAlbums([Number(id)]);
      res.status(200).json({
        code: 200,
        message: '相册删除成功',
        success: true,
        data: null,
      });
    } catch (error: any) {
      console.error('相册删除失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册删除失败',
        success: false,
        data: null,
      });
    }
  }

  /**
   * @description: 设置相册封面
   * PUT /admin/album/:id/cover
   */
  public static async setAlbumCover(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { coverId } = req.body;
      
      if (!coverId) {
        throw new Error('封面ID不能为空');
      }

      await AlbumService.updateAlbum(Number(id), { coverPhotoId: Number(coverId) });
      
      res.status(200).json({
        code: 200,
        message: '相册封面设置成功',
        success: true,
        data: null,
      });
    } catch (error: any) {
      console.error('相册封面设置失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '相册封面设置失败',
        success: false,
        data: null,
      });
    }
  }
}
