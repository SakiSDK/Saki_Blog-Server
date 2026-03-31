import { SummaryService } from '@/services/Summary.service';
import type { Request, Response } from 'express';
import { logger } from '@/utils/logger.util';
import { config } from '@/config';

export class SummaryController {
  /**
   * 流式生成摘要（SSE）
   * GET /api/v1/web/summary/stream?content=文章内容
   */
  public static async streamSummary(req: Request, res: Response) {
    const { content } = req.query;

    // 检查功能是否启用
    if (!config.deepseek.enabled) {
      return res.status(403).json({ error: '摘要功能未启用' });
    }

    if (!content) {
      return res.status(400).json({ error: '缺少文章内容' });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // 调用流式生成
      const stream = SummaryService.generateSummaryStream(content as string);

      // 逐块推送内容
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      // 推送完成标记
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error('流式生成失败', { error: error.message });
      res.write(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`);
      res.end();
    }
  }

  /**
   * 获取文章摘要（默认流式返回）
   * GET /api/v1/web/summary/:shortId
   */
  public static async getArticleSummary(req: Request, res: Response) {
    const { shortId } = req.params;

    // 检查功能是否启用
    if (!config.deepseek.enabled) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: '摘要功能未启用',
      });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // 获取文章并流式生成摘要
      const stream = SummaryService.getArticleSummaryStream(shortId);

      // 逐块推送内容
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      // 推送完成标记
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error('流式摘要生成失败', { error: error.message });
      res.write(`data: ${JSON.stringify({ error: error.message || '生成失败' })}\n\n`);
      res.end();
    }
  }
}
