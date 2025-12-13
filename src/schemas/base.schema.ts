import { z } from 'zod';

/** ---------- 数字类型 ---------- */
/** 正整数 ID */
export const zId = z
  .union([z.number(), z.string()]) // 先接收数字或字符串
  .transform((val) => {
    // 统一转换为数字：处理空字符串、全空格、非数字场景
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? NaN : Number(trimmed);
    }
    return val; // 数字类型直接返回
  })
  // 分步校验，错误提示更精准
  .refine((val) => !isNaN(val), { 
    message: "ID 必须是数字或数字格式的字符串（如 '123'、456）" 
  })
  .pipe(
    z.number().int("ID 必须是整数").positive("ID 必须是正整数")
  )
  .describe("正整数 ID");

/** 非负整数 ID（允许 0） */
export const zNonNegativeId = z
  .number("ID 必须是数字")
  .int("ID 必须是整数")
  .nonnegative("ID 必须是非负数")
  .describe("非负整数 ID");

/** 页码 */
export const zPageNum = z
  .coerce.number("页码必须是数字")
  .int("页码必须是整数")
  .positive("页码必须是正数")
  .min(1, "页码最小为 1")
  .default(1)

/** 每页数量 */
export const zPageSize = z
  .coerce.number("每页数量必须是数字")
  .int("每页数量必须是整数")
  .positive("每页数量必须是正数")
  .min(1, "每页数量最小为 1")
  .max(1000, "每页数量最大为 1000")
  .default(10)

/** 通用非负整数（如计数、状态码） */
export const zNonNegativeNumber = z
  .coerce.number("必须是数字")
  .int("必须是整数")
  .nonnegative("必须是非负数")
  .default(0)

/** 通用正整数 */
export const zPositiveNumber = z
  .coerce.number("必须是数字")
  .int("必须是整数")
  .positive("必须是正数")

/** 价格/金额（保留 2 位小数，非负数） */
export const zPrice = z
  .number("价格必须是数字")
  .nonnegative("价格不能为负数")
  .multipleOf(0.01, "价格最多保留两位小数")

/** 百分比（0-100） */
export const zPercentage = z
  .number("百分比必须是数字")
  .min(0, "百分比最小为 0")
  .max(100, "百分比最大为 100")
  .describe("百分比");

/** 权重/评分（0-5） */
export const zRating = z
  .number("评分必须是数字")
  .min(0, "评分最小为 0")
  .max(5, "评分最大为 5")

/** ---------- 字符串内容 ---------- */
/** 非空字符串（trim 后至少 1 字符） */
export const zStr = z
  .string("必须是文本")
  .trim()
  .min(1, "内容不能为空")

/** 可选字符串（允许为空或 undefined） */
export const zOptionalStr = z
  .string("必须是文本")
  .trim()
  .optional()

/** 可空字符串（允许 null） */
export const zNullableStr = z
  .string("必须是文本")
  .trim()
  .nullable()
  .describe("可空文本");

/** 用户名（3-20 位，支持中英文、数字、下划线） */
export const zUsername = z
  .string("必须是文本")
  .trim()
  .min(3, "用户名至少 3 个字符")
  .max(20, "用户名最多 20 个字符")
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含中英文、数字和下划线")
  .describe("用户名");

/** 密码（8-32 位，需包含字母和数字） */
export const zPassword = z
  .string("必须是文本")
  .min(8, "密码至少 8 位")
  .max(32, "密码最多 32 位")
  .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/, "密码需包含字母和数字")
  .describe("登录密码");

/** 强密码（8-32 位，需包含大小写字母、数字和特殊字符） */
export const zStrongPassword = z
  .string("必须是文本")
  .min(8, "密码至少 8 位")
  .max(32, "密码最多 32 位")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: "密码需包含大小写字母、数字和特殊字符"
  })
  .describe("强密码");

/** 名称/标题（1-100 字符） */
export const zName = z
  .string("名称必须是文本")
  .trim()
  .min(1, "名称不能为空")
  .max(100, "名称最多 100 个字符")
  .describe("名称");

/** 描述/简介（可选，最多 500 字符） */
export const zDescription = z
  .string("描述必须是文本")
  .trim()
  .max(500, "描述最多 500 个字符")
  .optional()
  .describe("描述");

/** 内容/正文（1-10000 字符） */
export const zContent = z
  .string("内容必须是文本")
  .trim()
  .min(1, "内容不能为空")
  .max(10000, "内容最多 10000 个字符")
  .describe("内容");

/** 颜色代码（十六进制） */
export const zColor = z
  .string("颜色必须是文本")
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "颜色格式不正确")
  .describe("十六进制颜色代码");

/** 版本号（语义化版本） */
export const zVersion = z
  .string("版本号必须是文本")
  .regex(/^\d+\.\d+\.\d+$/, "版本号格式应为 x.y.z")
  .describe("语义化版本号");

/** ---------- 联系方式 ---------- */
/** 邮箱 */
export const zEmail = z
  .string("邮箱必须是文本")
  .email("邮箱格式不正确")
  .toLowerCase() // 统一转小写
  .max(100, "邮箱最多 100 个字符")
  .describe("电子邮箱");

/** 中国大陆手机号 */
export const zPhone = z
  .string("手机号必须是文本")
  .regex(/^1[3-9]\d{9}$/, "手机号格式不正确")
  .describe("中国大陆手机号");

/** URL 链接 */
export const zUrl = z
  .string("URL 必须是文本")
  .url("URL 格式不正确")
  .max(500, "URL 最多 500 个字符")
  .describe("URL 链接");

/** IP 地址 */
export const zIp = z
  .string("IP 地址必须是文本")
  .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "IP 地址格式不正确")
  .describe("IP 地址");

/** ---------- 日期和时间 ---------- */
/** ISO 8601 日期字符串（如 "2025-01-01"） */
export const zDateStr = z
  .string("日期必须是文本")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .describe("日期字符串 (YYYY-MM-DD)");

/** ISO 8601 日期时间（如 "2025-01-01T12:00:00Z"） */
export const zDateTimeStr = z
  .string("时间必须是文本")
  .datetime("时间格式不正确，应为 ISO 8601 格式")
  .describe("ISO 8601 日期时间");

/** 时间戳（毫秒） */
export const zTimestamp = z
  .number("时间戳必须是数字")
  .int("时间戳必须是整数")
  .positive("时间戳必须是正数")
  .describe("时间戳（毫秒）");

/** ---------- 枚举和状态 ---------- */
/** 通用状态（0=禁用, 1=启用） */
export const zStatus = z
  .number("状态必须是数字")
  .int("状态必须为整数")
  .min(0, "状态值无效")
  .max(1, "状态值无效")
  .describe("状态：0-禁用，1-启用");

/** 通用状态枚举 */
export const zStatusEnum = z
  .enum(["active", "inactive", "pending", "deleted"])
  .describe("状态：active-激活, inactive-未激活, pending-待审核, deleted-已删除");

/** 排序方向（asc / desc） */
export const zSortOrder = z
  .enum(["asc", "desc"], "排序方向必须是 asc 或 desc")
  .default("desc")
  .describe("排序：asc 升序，desc 降序");

/** 布尔值（数字 0/1） */
export const zBooleanNumber = z
  .number("必须是数字")
  .int("必须是整数")
  .min(0, "值必须为 0 或 1")
  .max(1, "值必须为 0 或 1")
  .describe("布尔值：0-否，1-是");

/** 是/否布尔值 */
export const zBoolean = z
  .boolean("必须为布尔值")
  .describe("布尔值");

/** ---------- 分页和列表查询通用结构 ---------- */
/** 通用分页查询参数 */
export const zPaginationQuery = z.object({
  page: zPageNum,
  pageSize: zPageSize,
});

/** 通用列表查询（含关键词搜索） */
export const zListQuery = zPaginationQuery.extend({
  keyword: zOptionalStr.describe("搜索关键词"),
});

/** 通用列表查询（含排序） */
export const zSortableListQuery = zListQuery.extend({
  sortBy: zOptionalStr.describe("排序字段"),
  sortOrder: zSortOrder.describe("排序方向"),
});

/** 时间范围查询 */
export const zDateRangeQuery = z.object({
  startDate: zDateStr.optional().describe("开始日期"),
  endDate: zDateStr.optional().describe("结束日期"),
}).refine(
  (data) => !(data.startDate && data.endDate) || data.startDate <= data.endDate,
  { message: "开始日期不能晚于结束日期" }
);

/** ---------- 文件相关 ---------- */
/** 文件 MIME 类型 */
export const zMimeType = z
  .string("MIME 类型必须是文本")
  .regex(/^[a-z]+\/[a-z0-9-+.]+$/, "MIME 类型格式不正确")
  .describe("文件 MIME 类型");

/** 文件大小（字节） */
export const zFileSize = z
  .number("文件大小必须是数字")
  .int("文件大小必须是整数")
  .positive("文件大小必须是正数")
  .describe("文件大小（字节）");

/** 图片文件验证 */
export const zImageFile = z.object({
  mimetype: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
    { message: "只支持 JPEG, PNG, GIF, WebP 格式的图片" }
  ),
  size: z.number().max(5 * 1024 * 1024, "图片大小不能超过 5MB"),
});

/** ---------- 数据库相关 ---------- */
/** 软删除字段 */
export const zSoftDelete = z.object({
  deletedAt: zDateTimeStr.nullable().optional().describe("删除时间"),
});

/** 时间戳字段 */
export const zTimestamps = z.object({
  createdAt: zDateTimeStr.describe("创建时间"),
  updatedAt: zDateTimeStr.describe("更新时间"),
});

/** 完整的基础模型字段 */
export const zBaseModel = z.object({
  id: zId,
  ...zTimestamps.shape,
  ...zSoftDelete.shape,
});

/** ---------- 实用工具 ---------- */
/** 任意对象（非 null 的 object） */
export const zObject = z
  .object({}, "必须为对象")
  .catchall(z.unknown());

/** 任意数组 */
export const zArray = z.array(z.unknown(), "必须为数组");

/** 字符串数组 */
export const zStringArray = z.array(zStr, "必须为字符串数组");

/** 数字数组 */
export const zNumberArray = z.array(z.number(), "必须为数字数组");

/** ID 数组 */
export const zIdArray = z.array(zId, "必须为 ID 数组");

/** 可空值 */
export const zNullable = <T extends z.ZodTypeAny>(schema: T) => 
  z.union([schema, z.null()]);

/** 可选值 */
export const zOptional = <T extends z.ZodTypeAny>(schema: T) => 
  schema.optional();

/** 记录类型 */
export const zRecord = <T extends z.ZodTypeAny>(valueSchema: T) => 
  z.record(z.string(), valueSchema);

/** ---------- 响应结构 ---------- */
/** 通用响应结构 */
export const zResponse = <T extends z.ZodTypeAny>(dataSchema?: T) => 
  z.object({
    success: z.boolean().describe("是否成功"),
    message: zOptionalStr.describe("消息"),
    data: dataSchema ? dataSchema.optional() : z.unknown().optional(),
    error: zOptionalStr.describe("错误信息"),
    code: z.number().int().optional().describe("状态码"),
  });

/** 分页列表响应结构 */
export const zPaginationResponse = <T extends z.ZodTypeAny>(itemSchema: T) => 
  z.object({
    success: z.boolean().describe("是否成功"),
    message: zOptionalStr.describe("消息"),
    data: z.object({
      items: z.array(itemSchema).describe("数据列表"),
      total: zNonNegativeNumber.describe("总条数"),
      page: zPageNum.describe("当前页码"),
      pageSize: zPageSize.describe("每页数量"),
      totalPages: zNonNegativeNumber.describe("总页数"),
    }),
    error: zOptionalStr.describe("错误信息"),
    code: z.number().int().optional().describe("状态码"),
  });

/** ---------- 类型导出 ---------- */
// 数字类型
export type ZId = z.infer<typeof zId>;
export type ZPageNum = z.infer<typeof zPageNum>;
export type ZPageSize = z.infer<typeof zPageSize>;
export type ZNonNegativeNumber = z.infer<typeof zNonNegativeNumber>;

// 字符串类型
export type ZStr = z.infer<typeof zStr>;
export type ZUsername = z.infer<typeof zUsername>;
export type ZPassword = z.infer<typeof zPassword>;
export type ZName = z.infer<typeof zName>;

// 联系方式
export type ZEmail = z.infer<typeof zEmail>;
export type ZPhone = z.infer<typeof zPhone>;
export type ZUrl = z.infer<typeof zUrl>;

// 日期时间
export type ZDateStr = z.infer<typeof zDateStr>;
export type ZDateTimeStr = z.infer<typeof zDateTimeStr>;

// 枚举状态
export type ZStatus = z.infer<typeof zStatus>;
export type ZStatusEnum = z.infer<typeof zStatusEnum>;
export type ZSortOrder = z.infer<typeof zSortOrder>;
export type ZBooleanNumber = z.infer<typeof zBooleanNumber>;

// 查询参数
export type ZPaginationQuery = z.infer<typeof zPaginationQuery>;
export type ZListQuery = z.infer<typeof zListQuery>;
export type ZSortableListQuery = z.infer<typeof zSortableListQuery>;
export type ZDateRangeQuery = z.infer<typeof zDateRangeQuery>;

// 响应类型
export type ZResponse<T extends z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>> = any> = z.infer<ReturnType<typeof zResponse<T>>>;
export type ZPaginationResponse<T extends z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>> = any> = z.infer<ReturnType<typeof zPaginationResponse<T>>>;



// 默认导出
export default {
  // 数字类型
  zId,
  zPageNum,
  zPageSize,
  zNonNegativeNumber,
  zPositiveNumber,
  zPrice,
  zPercentage,
  zRating,
  
  // 字符串类型
  zStr,
  zOptionalStr,
  zNullableStr,
  zUsername,
  zPassword,
  zStrongPassword,
  zName,
  zDescription,
  zContent,
  zColor,
  zVersion,
  
  // 联系方式
  zEmail,
  zPhone,
  zUrl,
  zIp,
  
  // 日期时间
  zDateStr,
  zDateTimeStr,
  zTimestamp,
  
  // 枚举状态
  zStatus,
  zStatusEnum,
  zSortOrder,
  zBooleanNumber,
  zBoolean,
  
  // 查询参数
  zPaginationQuery,
  zListQuery,
  zSortableListQuery,
  zDateRangeQuery,
  
  // 文件相关
  zMimeType,
  zFileSize,
  zImageFile,
  
  // 数据库相关
  zSoftDelete,
  zTimestamps,
  zBaseModel,
  
  // 实用工具
  zObject,
  zArray,
  zStringArray,
  zNumberArray,
  zIdArray,
  zNullable,
  zOptional,
  zRecord,
  
  // 响应结构
  zResponse,
  zPaginationResponse,
};