import { TagService } from "../../services/Tag.service";
import { Request, Response } from "express";
import type { TagListResult } from "../../types/models/tag.type";
import camelcaseKeys from "camelcase-keys";
import type { TagListQuery } from '../../schemas/web/tag.schema';


export class TagController { 
  public static async createTag(req: Request, res: Response) {
    try {
      // 获取请求体
      const { name, description, order, status } = req.body;
      // 调用服务层创建标签
      const createdTag = await TagService.createTag({
        name,
        description,
        order,
        status,
      })
      res.status(201).json({
        code: 201,
        success: true,
        message: "标签创建成功",
        data: camelcaseKeys(
          createdTag.get({ plain: true }),
          { deep: true }
        ),
      });
    } catch (error) {
      console.error("创建标签失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: "创建标签失败",
        data: null,
      });
      return;
    }
  }
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
          list: tags.map((tag) => {
            return camelcaseKeys(tag, { deep: true });
          }), // 统一列表字段名
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
  /**
   * 切换标签状态
   */
  public static async toggleTagStatus(req: Request, res: Response) {
    try {
      // 获取并校验 tagId（中间件可提前校验是否为正整数）
      const tagId = Number(req.params.id);
      // 调用服务层执行状态切换
      const updatedTag = await TagService.toggleTagStatus(tagId);
      // 成功响应
      res.status(200).json({
        code: 200,
        success: true,
        message: "标签状态切换成功",
        data: camelcaseKeys(
          updatedTag.get({plain: true}),
          { deep: true }
        ),
      });
    } catch (error) {
      console.error("切换标签状态失败：", error);

      // 业务错误
      if (error instanceof Error) {
        return res.status(500).json({
          code: 500,
          success: false,
          message: error.message || "切换标签状态失败",
          data: null,
        });
      }
      // 未知错误
      res.status(500).json({
        code: 500,
        success: false,
        message: "服务器内部错误",
        data: null,
      });
    }
  }
  
  /**
   * 删除标签
   */
  public static async deleteTag(req: Request, res: Response) {
    try {
      const tagId = Number(req.params.id);
      await TagService.deleteTag(tagId);
      res.status(200).json({
        code: 200,
        success: true,
        message: "标签删除成功",
        data: null,
      });
    } catch (error) {
    console.error('删除标签失败：', error);

    // 业务错误
    if (error instanceof Error) {
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '删除标签失败',
        data: null,
      });
    }
    // 未知错误兜底
    res.status(500).json({
      code: 500,
      success: false,
      message: '服务器内部错误',
      data: null,
    });
    }
  }

  /**
   * 批量删除标签
   */
  public static async bulkDeleteTag(req: Request, res: Response) {
    try {
      const { ids } = req.query;
      // 格式转换
      const idList = Array.isArray(ids)? ids.map(id => Number(id)) : [Number(ids)];
      // 调用服务层执行批量删除
      const deletedRes = await TagService.bulkDeleteTag(idList);
      res.status(200).json({
        code: 200,
        success: true,
        message: `成功删除 ${deletedRes.deletedCount} 个标签`,
        data: null,
      });
    } catch (error) {
    console.error('批量删除标签失败：', error);
    if (error instanceof Error) {
      res.status(500).json({
        code: 500,
        success: false,
        message: error.message || '批量删除标签失败',
        data: null,
      });
    }
    res.status(500).json({
      code: 500,
      success: false,
      message: '服务器内部错误',
      data: null,
    });
    }
  }

  /**
   * 更新标签
   */
  public static async updateTag(req: Request, res: Response) {
    try {
      const tagId = Number(req.params.id);
      const { name, description, status, order } = req.body;
      // 调用服务层执行更新
      const updatedTag = await TagService.updateTag(tagId, { name, description, status, order });
      res.status(200).json({
        code: 200,
        success: true,
        message: "标签更新成功",
        data: camelcaseKeys(
          updatedTag.get({plain: true}),
          { deep: true }
        ),
      })
    }catch (error) {
      console.error('更新标签失败：', error);
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          success: false,
          message: error.message || '更新标签失败',
          data: null,
        });
      }
      res.status(500).json({
        code: 500,
        success: false,
        message: '服务器内部错误',
      })
    }
  }
}