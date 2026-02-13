import { CategoryService } from '@/services/Category.service';
import { Request, Response } from 'express';
import type { CategoryListResult } from '@/types/models/category.type';


export class CategoryController {

  public static async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await CategoryService.getAllCategories();
      res.status(200).json({
        code: 200,
        success: true,
        message: "获取所有分类成功",
        data: {
          list: categories
        }
      });
    } catch (error) {
      console.log('获取所有分类失败：', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: "获取所有分类失败",
        data: null,
      });
    }
  }
  public static async createCategory(req: Request, res: Response) {
    try {
      // 获取请求体
      const { name, description, order, status } = req.body;
      // 调用服务层创建标签
      const createdTag = await CategoryService.createCategory({
        name,
        description,
        order,
        status,
      })
      res.status(201).json({
        code: 201,
        success: true,
        message: "分类字段创建成功",
        data: createdTag,
      });
    } catch (error) {
      console.error("创建分类字段失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: "创建分类字段失败",
        data: null,
      });
      return;
    }
  }
  public static async updateCategory(req: Request, res: Response) { 
    try {
      const categoryId = Number(req.params.id);
      // 获取请求体
      const { name, description, order, status } = req.body;
      // 调用服务层更新分类字段
      const updatedCategory = await CategoryService.updateCategory(categoryId, {
        name,
        description,
        order,
        status,
      })
      res.status(200).json({
        code: 200,
        success: true,
        message: "分类字段更新成功",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("更新分类字段失败：", error);
      res.status(500).json({
        code: 500,
        success: false,
        message: "更新分类字段失败",
        data: null,
      });
      return;
    }
  }
  public static async deleteCategory(req: Request, res: Response) { 
    try {
      const categoryId = Number(req.params.id);
      // 调用服务层删除分类字段
      const deletedCategory = await CategoryService.deleteCategory(categoryId);
      res.status(200).json({
        code: 200,
        success: true,
        message: "分类字段删除成功",
        data: null,
      })
    }catch (error) {
      console.error('删除分类字段失败：', error);
      // 业务错误
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          success: false,
          message: error.message || '删除分类字段失败', 
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
  public static async bulkDeleteCategory(req: Request, res: Response) { 
    try {
      const { ids } = req.query;
      const idList = Array.isArray(ids)? ids.map(id => Number(id)) : [Number(ids)];
      // 调用服务层批量删除分类字段
      const deletedCategories = await CategoryService.bulkDeleteCategory(idList);
      res.status(200).json({
        code: 200,
        success: true,
        message: `成功删除 ${deletedCategories.deletedCount} 个分类字段`,
        data: null,
      })
    }catch (error) {
      console.error('批量删除分类字段失败：', error);
      // 业务错误
      if (error instanceof Error) {
        res.status(500).json({
          code: 500,
          success: false,
          message: error.message || '批量删除分类字段失败', 
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
  public static async getCategoryList(req: Request, res: Response) { 
    try {
      const {
        keyword, id, status,
        startTime, endTime,
        page, pageSize, sort, orderBy,
      } = req.query;
      // 类型转换并设置默认值
      const pageNum: number = Number(page) || 1;
      const size: number = Number(pageSize) || 10;
      const query = {
        id: id ? Number(id) : undefined,
        keyword: typeof keyword === 'string' ? keyword : undefined,
        status: ['active', 'inactive'].includes(status as string) ? (status as "active" | "inactive") : undefined,
        createdFrom: typeof startTime === 'string' ? startTime : undefined,
        createdTo: typeof endTime === 'string' ? endTime : undefined,
        page: pageNum,
        pageSize: size,
        sort:
          ['asc', 'desc'].includes(sort as string)
            ? (sort as "asc" | "desc")
            : "desc",
        orderBy:
          ['id', 'order', 'postCount', 'createdAt', 'updatedAt'].includes(orderBy as string)
            ? (orderBy as "id" | "order" | "postCount" | "createdAt" | "updatedAt")
            : "createdAt",
      }
      // 调用服务层获取数据（类型安全约束）
      const result: CategoryListResult = await CategoryService.getCategoryList(query);
      const { categories, pagination } = result;
      res.status(200).json({
        code: 200,
        success: true,
        message: "获取分类列表成功",
        data: {
          list: categories,
          pagination: {
            ...pagination,
            hasPrev: pagination.page > 1,
            hasNext: pagination.page < pagination.totalPages,
          },
        },
      })
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
      const categoryId = Number(req.params.id);
      // 调用服务层执行状态切换
      const updatedTag = await CategoryService.toggleCategoryStatus(categoryId);
      // 成功响应
      res.status(200).json({
        code: 200,
        success: true,
        message: "分类字段状态切换成功",
        data: updatedTag,
      });
    } catch (error) {
      console.error("切换分类字段状态失败：", error);

      // 业务错误
      if (error instanceof Error) {
        return res.status(500).json({
          code: 500,
          success: false,
          message: error.message || "切换分类字段状态失败",
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
}