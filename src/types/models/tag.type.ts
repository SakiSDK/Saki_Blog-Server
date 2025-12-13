import { Tag } from "../../models/Tag.model";
import type { Pagination } from "../app";

// 定义返回的Tag类型
export type TagListItem = Pick<Tag, 'id' | 'name' | 'description' | 'post_count' | 'created_at'>

// 定义出参类型
export type TagListResult = {
  tags: TagListItem[]; // 标签列表（你的 Tag 模型类型）
  pagination: Pagination;
};

// 热门标签响应类型
export interface HotTagResult {
  tags: Tag[]; // 热门标签数组
}