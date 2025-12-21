import { Category } from './../../models/Category.model';
import { Pagination } from '../app';
export type { CategoryListParams } from '../../schemas/web/category.schema';

// 定义返回的Category类型
export type CategoryListItem = Pick<
  Category,
  'id' | 'name' | 'description' | 'post_count' | 'order' | 'status' | 'created_at' | 'updated_at'
>


// 定义出参类型
export type CategoryListResult = {
  categories: CategoryListItem[]; // 标签列表（你的 Category 模型类型）
  pagination: Pagination;
};
