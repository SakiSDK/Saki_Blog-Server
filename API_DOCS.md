# 博客接口详细文档 (API Documentation)

本文档由系统脚本自动生成，涵盖 Web 前台与 Admin 后台的所有路由接口及其请求参数校验规则（基于 Zod Schema）。

## 目录
- [Web 前台接口](#web-前台接口)
- [Admin 后台接口](#admin-后台接口)

## Web 前台接口

### web/auth.router.ts

#### `GET` /api/v1/web/auth/nonce
**描述:** 生成 nonce（防重放攻击）

**请求参数:** 无

---

#### `GET` /api/v1/web/auth/captcha
**描述:** 生成图形验证码

**请求参数:** 无

---

#### `POST` /api/v1/web/auth/send-email-code
**描述:** 发送注册邮箱验证码

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `email` | string | 是 | - | - |
| `captchaKey` | string | 是 | - | - |
| `captchaCode` | string | 是 | - | - |


---

#### `POST` /api/v1/web/auth/register
**描述:** Web端注册，通过邮箱注册

**请求参数:** 无

---

#### `POST` /api/v1/web/auth/login
**描述:** Web端普通登录

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `email` | string | 是 | - | - |
| `password` | string | 是 | - | - |
| `captchaKey` | string | 是 | - | - |
| `captchaCode` | string | 是 | - | - |
| `nonce` | string | 是 | - | - |
| `rememberMe` | boolean | 否 | - | - |


---

#### `POST` /api/v1/web/auth/logout
**描述:** Web端登出

**请求参数:** 无

---

#### `GET` /api/v1/web/auth/github/callback
**描述:** Web端通过GitHub登录

**请求参数:** 无

---

#### `GET` /api/v1/web/auth/google/callback
**描述:** Web端通过Google登录

**请求参数:** 无

---

### web/album.router.ts

#### `GET` /api/v1/web/album
**描述:** 获取相册列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `status` | enum("public" | "private") | 否 | 相册状态 | - |
| `orderBy` | enum("id" | "priority" | "photoCount" | "createdAt") | 否 | 相册排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | - | desc |


---

#### `GET` /api/v1/web/album/:slug/photos
**描述:** 获取相册内的所有图片

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `slug` | string | 是 | 相册别名 | - |


**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | - | 1 |
| `pageSize` | number | 否 | - | 10 |


---

### web/category.router.ts

#### `GET` /api/v1/web/category
**描述:** 获取分类列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 分类ID | - |
| `status` | enum("active" | "inactive") | 否 | 分类状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "name" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

### web/tag.router.ts

#### `GET` /api/v1/web/tag
**描述:** 获取标签列表（GET /api/v1/web/tag）

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 标签ID | - |
| `status` | enum("active" | "inactive") | 否 | 标签状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

#### `GET` /api/v1/web/tag/hot
**描述:** 获取热门标签

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `pageSize` | number | 否 | 数量 | 10 |
| `withPostCount` | boolean | 否 | 是否返回文章数量 | - |


---

### web/article.router.ts

#### `GET` /api/v1/web/article/search
**描述:** 搜索文章（依靠MeilisSearch）

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | desc |
| `orderBy` | enum("id" | "createdAt" | "updatedAt" | "priority") | 否 | 排序字段 | createdAt |
| `author` | string | 否 | 文章作者 | - |
| `keyword` | string | 否 | 搜索关键词 | - |
| `status` | enum("draft" | "published") | 否 | - | draft |
| `createdFrom` | date | string | number | 否 | - | - |
| `createdTo` | date | string | number | 否 | - | - |


---

#### `GET` /api/v1/web/article
**描述:** 获取文章列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | desc |
| `orderBy` | enum("id" | "createdAt" | "updatedAt" | "priority") | 否 | 排序字段 | createdAt |


---

#### `GET` /api/v1/web/article/latest
**描述:** 获取最近文章列表

**请求参数:** 无

---

#### `GET` /api/v1/web/article/timeline
**描述:** 获取时间线文章列表

**请求参数:** 无

---

#### `GET` /api/v1/web/article/random
**描述:** 获取随机文章

**请求参数:** 无

---

#### `GET` /api/v1/web/article/:shortId
**描述:** 获取文章详情，通过 shortId 获取文章详情

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `shortId` | string | 是 | 文章 shortId | - |


---

#### `GET` /api/v1/web/article/:postId/comment
**描述:** 获取某篇文章的评论列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |


---

#### `POST` /api/v1/web/article/:postId/comment
**描述:** 给某篇文章发表评论

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `postId` | number | string | 否 | 文章ID | - |
| `post_id` | number | string | 否 | 文章ID | - |
| `parentId` | number | string | 否 | 父评论ID | - |
| `parent_id` | number | string | 否 | 父评论ID | - |
| `replyToId` | number | string | 否 | 回复的评论ID | - |
| `reply_to_id` | number | string | 否 | 回复的评论ID | - |
| `userId` | string | 否 | 用户ID | - |
| `content` | string | 是 | 评论内容 | - |
| `userDevice` | string | 否 | 用户设备 | - |
| `user_device` | string | 否 | 用户设备 | - |
| `userBrowser` | string | 否 | 用户浏览器 | - |
| `user_browser` | string | 否 | 用户浏览器 | - |


---

#### `DELETE` /api/v1/web/article/comment/:id
**描述:** 删除评论

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 正整数 ID | - |


---

#### `POST` /api/v1/web/article/:shortId/like
**描述:** 点赞文章

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `shortId` | string | 是 | 文章 shortId | - |


---

#### `GET` /api/v1/web/article/:shortId/summary
**描述:** 根据文章的短ID获取文章摘要（流式返回）

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `shortId` | string | 是 | 文章 shortId | - |


---

#### `GET` /api/v1/web/article/:shortId/ai-comment
**描述:** AI文章评论

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `shortId` | string | 是 | 文章 shortId | - |


---

### web/announce.router.ts

#### `GET` /api/v1/web/announce
**描述:** 获取公告列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `type` | enum("notice" | "update" | "reminder" | "news" | "maintenance") | 否 | 公告类型 | - |
| `priority` | enum("high" | "medium" | "low") | 否 | 优先级 | - |
| `status` | enum("active" | "inactive") | 否 | - | - |


---

#### `GET` /api/v1/web/announce/:id
**描述:** 获取公告详情

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 公告ID | - |


---

## Admin 后台接口

### admin/auth.router.ts

#### `POST` /api/v1/admin/auth/login
**描述:** 获取唯一 nonce（用于防重放攻击）

**请求参数:** 无

---

#### `GET` /api/v1/admin/auth/nonce
**描述:** 获取唯一 nonce（用于防重放攻击）

**请求参数:** 无

---

#### `POST` /api/v1/admin/auth/logout
**描述:** 获取唯一 nonce（用于防重放攻击）

**请求参数:** 无

---

### admin/tag.router.ts

#### `GET` /api/v1/admin/tag
**描述:** 获取标签列表（分页 / 条件查询）

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 标签ID | - |
| `status` | enum("active" | "inactive") | 否 | 标签状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

#### `GET` /api/v1/admin/tag/all
**描述:** 获取所有标签（通常用于下拉框 / 选择器）

**请求参数:** 无

---

#### `GET` /api/v1/admin/tag/search
**描述:** 搜索标签（根据名称/描述）

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 标签ID | - |
| `status` | enum("active" | "inactive") | 否 | 标签状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

#### `PATCH` /api/v1/admin/tag/:id/status
**描述:** 更新标签状态

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 标签ID | - |


---

#### `POST` /api/v1/admin/tag
**描述:** 创建标签

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 标签名称 | - |
| `description` | string | literal | 否 | 标签描述 | - |
| `order` | number | 否 | 标签排序 | 0 |
| `status` | enum("active" | "inactive") | 是 | 标签状态 | - |


---

#### `DELETE` /api/v1/admin/tag/bulk
**描述:** 批量删除标签

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `ids` | number | string | number | string[] | 是 | 标签ID列表 | - |


---

#### `DELETE` /api/v1/admin/tag/:id
**描述:** 删除标签

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 标签ID | - |


---

#### `PUT` /api/v1/admin/tag/:id
**描述:** 更新标签

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 标签ID | - |


**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 标签名称 | - |
| `description` | string | literal | 否 | 标签描述 | - |
| `order` | number | 否 | 标签排序 | 0 |
| `status` | enum("active" | "inactive") | 是 | 标签状态 | - |


---

### admin/category.router.ts

#### `POST` /api/v1/admin/category
**描述:** 暂无描述

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 分类名称 | - |
| `description` | string | literal | 否 | 分类描述 | - |
| `order` | number | 否 | 分类排序 | 0 |
| `status` | enum("active" | "inactive") | 是 | 分类状态 | - |


---

#### `GET` /api/v1/admin/category
**描述:** 暂无描述

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 分类ID | - |
| `status` | enum("active" | "inactive") | 否 | 分类状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "name" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

#### `GET` /api/v1/admin/category/all
**描述:** 暂无描述

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 分类ID | - |
| `status` | enum("active" | "inactive") | 否 | 分类状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "name" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

#### `PATCH` /api/v1/admin/category/:id/status
**描述:** 暂无描述

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 分类ID | - |


---

#### `PUT` /api/v1/admin/category/:id
**描述:** 暂无描述

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 分类ID | - |


---

#### `DELETE` /api/v1/admin/category/bulk
**描述:** 暂无描述

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `ids` | number | string | number | string[] | 是 | 分类ID列表 | - |


---

#### `DELETE` /api/v1/admin/category/:id
**描述:** 暂无描述

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 标签ID | - |


---

#### `GET` /api/v1/admin/category/search
**描述:** 暂无描述

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `id` | number | string | 否 | 分类ID | - |
| `status` | enum("active" | "inactive") | 否 | 分类状态 | - |
| `keyword` | string | 否 | 搜索关键字 | - |
| `createdFrom` | string | 否 | 创建开始时间 | - |
| `createdTo` | string | 否 | 创建结束时间 | - |
| `orderBy` | enum("id" | "name" | "order" | "postCount" | "createdAt" | "updatedAt") | 否 | 排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | - |


---

### admin/upload.router.ts

#### `POST` /api/v1/admin/upload/article/image
**描述:** 上传文章图片（临时存储）

**请求参数:** 无

---

#### `DELETE` /api/v1/admin/upload/article/image/:filename
**描述:** 删除文章内临时图片

**请求参数:** 无

---

#### `POST` /api/v1/admin/upload/article/cover
**描述:** 上传文章封面（临时存储）

**请求参数:** 无

---

#### `DELETE` /api/v1/admin/upload/article/cover/:filename
**描述:** 删除文章封面

**请求参数:** 无

---

#### `POST` /api/v1/admin/upload/album
**描述:** 上传相册图片

**请求参数:** 无

---

### admin/article.router.ts

#### `POST` /api/v1/admin/article
**描述:** 创建文章

**请求参数:** 无

---

#### `GET` /api/v1/admin/article
**描述:** 获取文章列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | desc |
| `orderBy` | enum("id" | "createdAt" | "updatedAt" | "priority") | 否 | 排序字段 | createdAt |


---

#### `GET` /api/v1/admin/article/search
**描述:** @description 搜索文章

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `sort` | enum("asc" | "desc") | 否 | 排序方式 | desc |
| `orderBy` | enum("id" | "createdAt" | "updatedAt" | "priority") | 否 | 排序字段 | createdAt |
| `author` | string | 否 | 文章作者 | - |
| `keyword` | string | 否 | 搜索关键词 | - |
| `status` | enum("draft" | "published") | 否 | - | draft |
| `createdFrom` | date | string | number | 否 | - | - |
| `createdTo` | date | string | number | 否 | - | - |


---

#### `GET` /api/v1/admin/article/:id
**描述:** 获取文章详情

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 文章 id | - |


---

#### `DELETE` /api/v1/admin/article/:id
**描述:** 删除文章

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 文章 id | - |


---

### admin/album.router.ts

#### `POST` /api/v1/admin/album
**描述:** 创建相册

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 相册名称 | - |
| `title` | string | 是 | 相册标题 | - |
| `description` | string | 否 | 相册描述 | - |
| `status` | enum("public" | "private") | 否 | 相册状态 | - |


---

#### `GET` /api/v1/admin/album
**描述:** 获取相册列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `status` | enum("public" | "private") | 否 | 相册状态 | - |
| `orderBy` | enum("id" | "priority" | "photoCount" | "createdAt") | 否 | 相册排序字段 | - |
| `sort` | enum("asc" | "desc") | 否 | - | desc |


---

#### `PUT` /api/v1/admin/album/:id
**描述:** 更新相册

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | string | 是 | 相册名称 | - |
| `title` | string | 是 | 相册标题 | - |
| `description` | string | 否 | 相册描述 | - |
| `status` | enum("public" | "private") | 否 | 相册状态 | - |
| `priority` | number | 否 | 相册优先级 | - |
| `coverPhotoId` | number | string | 否 | 相册封面ID | - |


---

#### `DELETE` /api/v1/admin/album
**描述:** 删除相册（支持批量删除）

**查询参数 (Query):**

无

---

#### `DELETE` /api/v1/admin/album/:id
**描述:** 删除单个相册

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 相册ID | - |


---

#### `GET` /api/v1/admin/album/:id/photos
**描述:** 获取相册内的所有图片

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 相册ID | - |


---

#### `DELETE` /api/v1/admin/album/:id/photos
**描述:** 删除相册内的照片

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 相册ID | - |


**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `photoIds` | string | string[] | number | number[] | 是 | - | - |


---

### admin/announce.router.ts

#### `GET` /api/v1/admin/announce
**描述:** 获取公告列表

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 10 |
| `type` | enum("notice" | "update" | "reminder" | "news" | "maintenance") | 否 | 公告类型 | - |
| `priority` | enum("high" | "medium" | "low") | 否 | 优先级 | - |
| `status` | enum("active" | "inactive") | 否 | - | - |


---

#### `GET` /api/v1/admin/announce/:id
**描述:** 获取单个公告详情

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 正整数 ID | - |


---

#### `POST` /api/v1/admin/announce
**描述:** 创建公告

**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `content` | string | 是 | 公告内容 | - |
| `type` | enum("notice" | "update" | "reminder" | "news" | "maintenance") | 是 | 公告类型 | - |
| `priority` | enum("high" | "medium" | "low") | 否 | 优先级 | low |
| `status` | enum("active" | "inactive") | 否 | - | active |


---

#### `PUT` /api/v1/admin/announce/:id
**描述:** 更新公告

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 正整数 ID | - |


**请求体 (Body):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `content` | string | 否 | 公告内容 | - |
| `type` | enum("notice" | "update" | "reminder" | "news" | "maintenance") | 否 | 公告类型 | - |
| `priority` | enum("high" | "medium" | "low") | 否 | 优先级 | - |
| `status` | enum("active" | "inactive") | 否 | - | - |


---

#### `DELETE` /api/v1/admin/announce/bulk
**描述:** 批量删除公告

**查询参数 (Query):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `ids` | string | string[] | number | number[] | 是 | - | - |


---

#### `DELETE` /api/v1/admin/announce/:id
**描述:** 删除单个公告

**路径参数 (Params):**

| 字段名 | 类型 | 必填 | 描述 | 默认值 |
| --- | --- | --- | --- | --- |
| `id` | number | string | 是 | 正整数 ID | - |


---

