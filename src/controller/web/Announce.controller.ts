import { AnnounceService } from '@/services/Announce.service';
import type { Request, Response } from 'express';



export class AnnounceController {
  public static async getAnnounceList(req: Request, res: Response) {
    try {
      const { page, pageSize, type, priority } = req.query;
      const { list, pagination } = await AnnounceService.getAnnounceList({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 10,
        type: type as any || null,
        priority: priority as any || null,
      });
      res.json({ 
        code: 200,
        success: true,
        message: '获取公告列表成功',
        data: {
          list,
          pagination,
        },
      });
    } catch (error: any) {
      console.error("获取公告列表失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '获取公告列表失败',
        data: null,
      });
    }
  }

  public static async getAnnounceDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const detail = await AnnounceService.getAnnounceById(Number(id));
      res.json({ 
        code: 200,
        success: true,
        message: '获取公告详情成功',
        data: detail,
      });
    } catch (error: any) {
      console.error("获取公告详情失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '获取公告详情失败',
        data: null,
      });
    }
  }
}