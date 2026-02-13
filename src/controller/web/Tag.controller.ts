import { TagService } from "../../services/Tag.service";
import { Request, Response } from "express";
import type { HotTagParams, TagListQuery } from "../../schemas/web/tag.schema";
import type { TagListResult, HotTagResult } from "../../types/models/tag.type";

export class TagController { 
  public static async getTagList(req: Request, res: Response){
    try {
      // 1. 获取已校验的分页参数（中间件已确保参数合法：整数、page≥1、pageSize≥1）
      const params: TagListQuery = {
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 10,
      };

      // 2. 调用服务层获取数据（类型安全约束）
      const result: TagListResult = await TagService.getTagList(params);
      const { tags, pagination } = result;

      // 3. 标准化成功响应（统一格式，便于前端处理）
      res.status(200).json({
        code: 200,
        success: true,
        message: "获取标签列表成功",
        data: {
          list: tags, // 统一列表字段名
          pagination: {
            ...pagination,
            hasNext: pagination.page < pagination.totalPages, // 新增：是否有下一页（可选）
            hasPrev: pagination.page > 1, // 新增：是否有上一页（可选）
          },
        },
      });
    } catch (error) {
      // 4. 统一错误处理（区分业务错误和未知错误）
      console.error("获取标签列表失败：", error);

      // 业务错误（服务层抛出的Error实例，携带错误信息）
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          message: error.message || "获取标签列表失败",
          success: false,
          data: null,
        });
        return;
      }

      // 未知错误（兜底处理）
      res.status(500).json({
        code: 500,
        message: "服务器内部错误",
        success: false,
        data: null,
      });
    }
  }

  public static async getHotTags(req: Request, res: Response) {
    try {
      const params: HotTagParams = {
        pageSize: Number(req.query.pageSize) || 10,
        withPostCount: Boolean(req.query.withCount) || true,
      }
      const result: HotTagResult = await TagService.getHotTags(params);
      const { tags } = result;

      res.status(200).json({
        code: 200,
        success: true,
        message: "获取热门标签成功",
        data: {
          list: tags, // 统一用list字段，与列表接口一致
        },
      });
    } catch (error) {
      // 5. 统一错误处理（与getTagList错误格式一致，便于前端统一捕获）
      console.error("获取热门标签失败：", error);

      // 业务错误（服务层抛出的自定义错误，携带具体信息）
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          message: error.message || "获取热门标签失败",
          success: false,
          data: null,
        });
        return;
      }

      // 未知错误（兜底处理，避免返回敏感信息）
      res.status(500).json({
        code: 500,
        message: "服务器内部错误",
        success: false,
        detail: error,
        data: null,
      });
    }
  }
}