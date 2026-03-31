import { Request, Response } from 'express';
import { AnnounceService } from '@/services/Announce.service';

export class AnnounceAdminController {
  /** 获取公告列表 */
  public static async getList(req: Request, res: Response) {
    try {
      const result = await AnnounceService.getAnnounceList(req.query as any);
      res.status(200).json({
        code: 200,
        success: true,
        message: '获取公告列表成功',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '获取公告列表失败',
      });
    }
  }

  /** 获取公告详情 */
  public static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AnnounceService.getAnnounceById(Number(id));
      res.status(200).json({
        code: 200,
        success: true,
        message: '获取公告详情成功',
        data: result,
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        code: error.status || 500,
        success: false,
        message: error.message || '获取公告详情失败',
      });
    }
  }

  /** 创建公告 */
  public static async create(req: Request, res: Response) {
    try {
      const result = await AnnounceService.createAnnounce(req.body);
      res.status(201).json({
        code: 201,
        success: true,
        message: '创建公告成功',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '创建公告失败',
      });
    }
  }

  /** 更新公告 */
  public static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AnnounceService.updateAnnounce(Number(id), req.body);
      res.status(200).json({
        code: 200,
        success: true,
        message: '更新公告成功',
        data: result,
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        code: error.status || 500,
        success: false,
        message: error.message || '更新公告失败',
      });
    }
  }

  /** 删除单个公告 */
  public static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AnnounceService.deleteAnnounce(Number(id));
      res.status(200).json({
        code: 200,
        success: true,
        message: '删除公告成功',
        data: null,
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        code: error.status || 500,
        success: false,
        message: error.message || '删除公告失败',
      });
    }
  }

  /** 批量删除公告 */
  public static async bulkDelete(req: Request, res: Response) {
    try {
      let ids: any = (req.query as any).ids ?? (req.body as any).ids;
      if (!Array.isArray(ids)) {
        ids = ids !== undefined ? [ids] : [];
      }
      const numIds = ids.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v));
      await AnnounceService.bulkDeleteAnnounces(numIds);
      res.status(200).json({
        code: 200,
        success: true,
        message: '批量删除公告成功',
        data: null,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '批量删除公告失败',
      });
    }
  }
}
