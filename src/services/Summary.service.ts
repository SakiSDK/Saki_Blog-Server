import { config } from "@/config";
import { resolveId } from "@/utils/id.util";
import { ArticleService } from "./Article.service";
import { BadRequestError, NotFoundError } from "@/utils/error.util";
import axios from "axios";


/** ---------- 类型定义 ---------- */
/** 文章摘要返回类型 */
export interface ArticleSummaryResult {
  shortId: string;
  title: string;
  summary: string;
  generatedAt: Date;
}

/** ---------- 主服务类 ---------- */
/**
 * 摘要服务类
 * @description 提供摘要相关的服务，使用 Deepseek AI 生成文章摘要
 */
export class SummaryService {

  /**
   * 流式生成文章摘要
   * @param content 文章内容
   * @yields 生成的文本片段
   */
  public static async *generateSummaryStream(content: string): AsyncGenerator<string> {
    try {
      // 限制内容长度
      const maxLength = 4000;
      const truncatedContent = content.length > maxLength
        ? content.substring(0, maxLength) + '...'
        : content;

      // 调用 Deepseek 流式 API
      const response = await axios({
        method: 'POST',
        url: `${config.deepseek.apiUrl}/chat/completions`,
        data: {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `
                你是一个专业的内容摘要助手。请为文章生成简洁、准确、有价值的摘要。
                要求：
                1. 摘要长度控制在100-200字之间
                2. 突出文章的核心观点和关键信息
                3. 语言流畅、逻辑清晰
                4. 避免冗余信息，直接提炼要点
              `
            },
            {
              role: 'user',
              content: `请为以下文章生成摘要：\n\n${truncatedContent}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: true // 开启流式输出
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.deepseek.apiKey}`
        },
        responseType: 'stream'
      });

      // 处理流式响应
      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // 跳过解析错误
          }
        }
      }

      // logger.info('流式摘要生成完成');
    } catch (error: any) {
      // logger.error('流式摘要生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取文章摘要（一次性返回）
   */
  public static async getArticleSummary(shortId: string): Promise<ArticleSummaryResult> {
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
      throw new BadRequestError('文章内容为空，无法生成摘要');
    }

    // 4. 生成摘要
    let summary = '';
    for await (const chunk of this.generateSummaryStream(article.content)) {
      summary += chunk;
    }

    return {
      shortId: article.shortId,
      title: article.title,
      summary,
      generatedAt: new Date(),
    };
  }

  /**
   * 根据文章短ID流式生成摘要
   * @param shortId 文章短ID
   * @yields 生成的文本片段
   */
  public static async *getArticleSummaryStream(shortId: string): AsyncGenerator<string> {
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
      throw new BadRequestError('文章内容为空，无法生成摘要');
    }

    // 4. 流式生成摘要
    yield* this.generateSummaryStream(article.content);
  }
}