// import { CommentService } from './../services/Comment.service';
// import { Request, Response } from "express";
// import { BadRequestError } from '../utils/errors';
// import { ShortIdUtil } from '../utils/shortIdUtil'
// import { AuthenticatedRequest } from '../middlewares/auth';
// import camelcaseKeys from 'camelcase-keys'

// // 工具函数：提取用户真实IP（处理代理场景）
// const getClientIp = (req: Request): string => {
//     const xForwardedFor = req.headers["x-forwarded-for"] as string;
//     if (xForwardedFor) {
//         return xForwardedFor.split(",")[0].trim(); // 取第一个IP（可能经过多层代理）
//     }
//     return (req.headers["x-real-ip"] as string) || (req.ip ? req.ip.replace("::ffff:", "") : "unknown");
// };

// export class CommentController { 
//     static async getAllCommentCount(req: Request, res: Response) {
//         return res.status(200).json({
//             message: '获取评论数量成功',
//             data: await CommentService.getAllCommentCount(),
//         });
//     }

//     static async createComment(req: AuthenticatedRequest, res: Response) {
//         try {
//             // 1. 验证登录状态
//             if (!req.user || !req.user.short_id) {
//                 throw new BadRequestError('请先登录');
//             }

//             // 获取用户id和文章id，以及用户所在地
//             const { short_id: userShortId } = req.user;
//             const { shortId: postShortId } = req.params;
//             const postId = ShortIdUtil.decode(postShortId)[0];
//             const userId = ShortIdUtil.decodeUserId(userShortId)[0];
//             const userIp = getClientIp(req);

//             const result = await CommentService.createComment({
//                 content: req.body.content,
//                 post_id: postId,
//                 user_ip: userIp,
//                 ...req.body,
//             }, userId);
//             res.status(201).json({
//                 message: '评论成功',
//                 data: camelcaseKeys(result, { deep: true }),
//             })
//         } catch (error: any) {
//             console.log('[CommentController.createComment]评论失败，: ', error.message);
//             res.status(400).json({
//                 message: `评论失败, ${error.message}`,
//             });
//         }
//     }

//     static async deleteComment(req: AuthenticatedRequest, res: Response) { 
//         try {
//             // 验证登录状态
//             if (!req.user || !req.user.short_id) {
//                 throw new BadRequestError('请先登录');
//             }

//             const commentId = parseInt(req.params.id, 10);
//             const { short_id } = req.user;
//             const userId = ShortIdUtil.decodeUserId(short_id)[0];

//             await CommentService.deleteComment(commentId, userId);

//             res.status(200).json({
//                 message: '删除成功',
//             })
//         } catch (error: any) {
//             console.log('[CommentController.deleteComment]删除失败，: ', error.message);
//         }
//     }

//     static async getNestedCommentsByPostId(req: Request, res: Response) { 
//         try {
//             const { shortId } = req.params;
//             const postId = ShortIdUtil.decode(shortId)[0];


//             // 类型转换：确保 page 和 pageSize 是数字
//             const page = parseInt(req.query.page as string, 10) || 1;
//             const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
//             const result = await CommentService.getNestedCommentsByPostId(postId, page, pageSize );

//             res.status(200).json({
//                 message: '获取评论成功',
//                 data: camelcaseKeys(result.data, {deep: true}),
//                 paginations: result.pagination,
//             });
//         } catch (error: any) {
//             console.log(`[commentController.getNestedCommentsByPostId] - [${error.message}]]`)
//             res.status(400).json({
//                 message: error.message || '请求参数有误或格式错误',
//             });
//         }
//     }
// }