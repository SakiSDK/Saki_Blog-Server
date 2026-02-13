import { Op } from 'sequelize';

/**
 * 通用列表查询构建器配置
 */
export interface QueryBuilderOptions {
  /** 模糊搜索字段列表 (e.g. ['name', 'description']) */
  searchFields?: string[];
  /** 精确匹配字段列表 (e.g. ['id', 'status']) */
  exactFields?: string[];
  /** 时间过滤字段 (默认: createdAt) */
  timeField?: string;
}

/**
 * 构建列表查询条件
 * @param query 查询参数对象
 * @param options 配置选项
 */
export const buildListQuery = (
  query: any,
  options: QueryBuilderOptions = {}
) => {
  const {
    page = 1,
    pageSize = 10,
    orderBy = 'createdAt',
    sort = 'desc',
    keyword,
    createdFrom,
    createdTo,
  } = query;

  const where: any = {};

  // 1. 精确匹配
  if (options.exactFields) {
    options.exactFields.forEach((field) => {
      const value = query[field];
      // 过滤 undefined 和 空字符串，保留 0 和 false
      if (value !== undefined && value !== '') {
        // 如果是 id 且看起来像数字，尝试转换 (虽然 sequelize 通常会自动处理)
        if (field === 'id' && !isNaN(Number(value))) {
          where[field] = Number(value);
        } else {
          where[field] = value;
        }
      }
    });
  }

  // 2. 关键字模糊搜索
  if (keyword?.trim() && options.searchFields?.length) {
    const kw = keyword.trim();
    where[Op.or] = options.searchFields.map((field) => ({
      [field]: { [Op.like]: `%${kw}%` },
    }));
  }

  // 3. 时间范围过滤
  const timeField = options.timeField || 'createdAt';
  if (createdFrom || createdTo) {
    where[timeField] = {};
    if (createdFrom) {
      where[timeField][Op.gte] = new Date(createdFrom);
    }
    if (createdTo) {
      where[timeField][Op.lte] = new Date(createdTo);
    }
  }

  return {
    where,
    order: [[orderBy, sort.toUpperCase()]],
    offset: (Number(page) - 1) * Number(pageSize),
    limit: Number(pageSize),
    page: Number(page),
    pageSize: Number(pageSize),
  };
};
