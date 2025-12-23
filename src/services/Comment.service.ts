// import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
// import { Comment, Post, User } from "../models/index";
// import { AmapService } from "./Amap.service";



// export class CommentService {
//     static async getAllCommentCount() {
//         const count = await Comment.count();
//         return count;
//     }
//     /**
//      * 创建评论/回复评论
//      * @param {Object} params 创建评论参数
//      * @param {number} userId 当前登录用户ID
//      */
//     static async createComment(params: any, userId: number) {
//         const { content, post_id, parent_id, user_device, user_ip, user_browser } = params;

//         //? 后续可能会加一个敏感词过滤

//         // 验证文章是否存在
//         const post = await Post.findByPk(post_id);
//         if (!post) throw new BadRequestError('文章不存在');

//         // 验证父评论是否存在以及否是当前文章的
//         if (parent_id) {
//             const parentComment = await Comment.findByPk(parent_id);
//             if (!parentComment) throw new BadRequestError('父评论不存在');
//             if (parentComment.post_id !== post_id) throw new BadRequestError('父评论不属于该文章');
//         }

//         // 根据用户ip获取用户所在地
//         const amapRes = await AmapService.getCityByIp(user_ip);

//         // 创建评论（钩子模型自动处理作者标记、XSS过滤）
//         const comment = await Comment.create({
//             content,
//             post_id,
//             parent_id,
//             user_id: userId,
//             user_browser,
//             user_device,
//             user_region: amapRes.province,
//             user_ip,
//         })

//         // 关联用户信息发送
//         const result = await Comment.findByPk(comment.id, {
//             include: [{
//                 model: User,
//                 as: 'user',
//                 attributes: ['avatar', 'short_id', 'nickname']
//             }]
//         })

//         return {
//             comment: result?.toJSON(),
//             fromattedContent: comment.formatContent(),
//         }
//     }

//     /**
//      * 根据文章ID查询嵌套评论（分页）
//      * @param {number} postId 文章ID
//      * @param {number} page 页码
//      * @param {number} pageSize 每页条数
//      */
//     static async getNestedCommentsByPostId(postId: number, page: number, pageSize: number) {
//         // 验证文章是否存在
//         const post = await Post.findByPk(postId);
//         if (!post) throw new BadRequestError('文章不存在');
        
//         // 调用模型静态方法获取嵌套评论
//         // const { comments, total } = await Comment.getNestedCommentsByPostId(postId, { page, pageSize });
//         const { comments, total } = await Comment.getMainCommentsWithFlatReplies(postId, { page, pageSize });
//         console.log('all Comments: ', comments)
        
//         return {
//             data: comments,
//             pagination: {
//                 page,
//                 pageSize,
//                 total,
//                 totalPages: Math.ceil(total / pageSize)
//             }
//         }
//     }

//     /**
//      * 根据评论ID查询单条评论
//      * @param {number} id 评论ID
//      */
//     static async getCommentById(id: number) {
//         const comment = await Comment.findByPk(id, {
//             include: [{ model: User, as: 'user', attributes: ['id', 'nickname', 'avatar', 'short_id'] }]
//         });

//         if (!comment) throw new NotFoundError('评论不存在');

//         return {
//             comment: comment.toJSON(),
//             formattedContent: comment.formatContent()
//         };
//     }
    
//     /**
//      * 删除评论（用户只能删除自己的评论，管理员可删除所有评论）
//      * @param {number} id 评论ID
//      * @param {number} userId 用户ID
//      */
//     static async deleteComment(id: number, userId: number) {
//         const comment = await Comment.findByPk(id);
//         const user = await User.findByPk(userId);

//         if (!user) throw new NotFoundError('用户不存在');
//         if (!comment) throw new NotFoundError('评论不存在');

//         if (comment.user_id !== userId && user.role!=='admin') throw new ForbiddenError('无权限删除该评论');

//         await Comment.destroy({ where: { id } });

//         return { messaeg: '评论删除成功' }
//     }
// }