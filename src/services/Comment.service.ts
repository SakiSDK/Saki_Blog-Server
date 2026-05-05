import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/error.util";
import { Comment, Article, User } from "../models/index";
import { AmapService } from "./Amap.service";
import { SensitiveWordFilter } from "../utils/sensitive-word.util";
import { config } from "@/config";
import { resolveId } from "@/utils/id.util";
import { ArticleService } from "./Article.service";
import axios from "axios";



export class CommentService {
    static async getAllCommentCount() {
        const count = await Comment.count();
        return count;
    }
    /**
     * 创建评论/回复评论
     * @param {Object} params 创建评论参数
     * @param {number} userId 当前登录用户ID
     */
    static async createComment(params: any, userId: number) {
        let { content, postId, parentId, userDevice, userBrowser, userIp } = params;

        // 敏感词过滤：拒绝包含敏感词的评论
        if (SensitiveWordFilter.hasSensitiveWords(content)) {
            // 获取包含的敏感词（用于日志或提示，可选）
            const words = SensitiveWordFilter.getSensitiveWords(content);
            console.warn(`[拦截] 用户 ${userId} 尝试发布包含敏感词的评论:`, words);
            throw new BadRequestError('评论内容包含敏感词汇，请修改后重试');
            
            // 替代方案：如果不抛错，而是自动替换敏感词为 ***，可以使用：
            // content = SensitiveWordFilter.filter(content);
        }

        // 验证文章是否存在
        const post = await Article.findByPk(postId);
        if (!post) throw new BadRequestError('文章不存在');

        // 验证父评论是否存在以及否是当前文章的
        if (parentId) {
            const parentComment = await Comment.findByPk(parentId);
            if (!parentComment) throw new BadRequestError('父评论不存在');
            if (parentComment.postId !== postId) throw new BadRequestError('父评论不属于该文章');
        }

        // 根据用户ip获取用户所在地
        let amapRes: any = { province: '未知' };
        if (userIp) {
            try {
                amapRes = await AmapService.getCityByIp(userIp);
            } catch (error) {
                console.warn('获取IP定位失败', error);
            }
        }

        // 创建评论（钩子模型自动处理作者标记、XSS过滤）
        const comment = await Comment.create({
            content,
            postId,
            parentId,
            userId: userId,
            userBrowser,
            userDevice,
            userRegion: amapRes.province,
            userIp,
        })

        // 关联用户信息发送
        const result = await Comment.findByPk(comment.id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['avatar', 'shortId', 'nickname']
            }],
            attributes: { exclude: ['postId', 'userId', 'status', 'userIp', 'updatedAt'] }
        })

        const commentData = result?.toJSON() as any;
        if (commentData) {
            commentData.content = result!.formatContent();
            if (!commentData.parentId) {
                commentData.replies = [];
            } else {
                // 如果是回复，需要加上被回复人的信息 replyToUser
                const parentComment = await Comment.findByPk(commentData.parentId, {
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['avatar', 'shortId', 'nickname']
                    }]
                });
                if (parentComment && parentComment.user) {
                    commentData.replyToUser = parentComment.user;
                }
            }
        }

        return commentData;
    }

    /**
     * 根据文章ID查询嵌套评论（分页）
     * @param {number} postId 文章ID
     * @param {number} page 页码
     * @param {number} pageSize 每页条数
     */
    static async getNestedCommentsByArticleId(articleId: number, page: number, pageSize: number) {
        // 验证文章是否存在
        const post = await Article.findByPk(articleId);
        if (!post) throw new BadRequestError('文章不存在');
        
        // 调用模型静态方法获取嵌套评论
        const { comments, total } = await Comment.getMainCommentsWithFlatReplies(articleId, { page, pageSize });
        
        return {
            data: comments,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }
    }

    /**
     * 根据评论ID查询单条评论
     * @param {number} id 评论ID
     */
    static async getCommentById(id: number) {
        const comment = await Comment.findByPk(id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'nickname', 'avatar', 'shortId'] }]
        });

        if (!comment) throw new NotFoundError('评论不存在');

        return {
            comment: comment.toJSON(),
            formattedContent: comment.formatContent()
        };
    }
    
    /**
     * 删除评论（用户只能删除自己的评论，管理员可删除所有评论）
     * @param {number} id 评论ID
     * @param {number} userId 用户ID
     */
    static async deleteComment(id: number, userId: number) {
        const comment = await Comment.findByPk(id);
        const user = await User.findByPk(userId);

        if (!user) throw new NotFoundError('用户不存在');
        if (!comment) throw new NotFoundError('评论不存在');

        if (comment.userId !== userId && user.role !== 'admin') throw new ForbiddenError('无权限删除该评论');

        await Comment.destroy({ where: { id } });

        return { message: '评论删除成功' }
    }

    /**
     * 根据文章短ID生成5条AI评论供选择
     * @param shortId 文章短ID
     * @returns 生成的评论数组
     */
    static async generateAiComments(shortId: string): Promise<string[]> {
        // 1. 验证 shortId
        if (!shortId || shortId.trim().length === 0) {
            throw new BadRequestError('文章短ID不能为空');
        }

        // 2. 获取文章详情
        const articleId = resolveId(shortId, config.salt.article);
        const article = await ArticleService.getArticleDetail(articleId);

        if (!article) {
            throw new NotFoundError('文章不存在');
        }

        // 3. 检查文章内容
        if (!article.content || article.content.trim().length === 0) {
            throw new BadRequestError('文章内容为空，无法生成评论');
        }

        // 4. 生成评论并返回数组
        try {
            // 限制内容长度
            const maxLength = 4000;
            const truncatedContent = article.content.length > maxLength
                ? article.content.substring(0, maxLength) + '...'
                : article.content;

            // 调用 Deepseek API
            const response = await axios({
                method: 'POST',
                url: `${config.deepseek.apiUrl}/chat/completions`,
                data: {
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: `你是一个热情、专业的博客读者。请仔细阅读用户的文章，并生成5条风格不同、内容相关的评论供用户选择。
要求：
1. 每条评论长度在20-100字之间
2. 角度可以包括：赞同观点、提出有价值的问题、分享个人相关经验、对文章细节的补充等
3. 语言风格自然、真诚，像真实用户的留言
4. 必须严格返回 JSON 格式，格式如下：
{
  "comments": [
    "评论1",
    "评论2",
    "评论3",
    "评论4",
    "评论5"
  ]
}
不要包含任何其他的 Markdown 标记或文字说明。`
                        },
                        {
                            role: 'user',
                            content: `这是我写的文章：\n\n${truncatedContent}\n\n请为我生成5条评论选项。`
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 800,
                    response_format: { type: 'json_object' } // 强制返回 JSON 对象
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.deepseek.apiKey}`
                }
            });

            const content = response.data.choices[0].message.content;
            try {
                // 尝试解析 JSON
                const parsed = JSON.parse(content);
                return parsed.comments || [];
            } catch (e) {
                // 如果解析失败，尝试清理可能的 markdown 代码块再解析
                const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);
                return parsed.comments || [];
            }
        } catch (error: any) {
            throw error;
        }
    }
}