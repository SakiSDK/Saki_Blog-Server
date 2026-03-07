
import { createShortIdCodec } from './shortId.codec';

/**
 * 解析 ID，支持数字 ID 和短 ID 字符串
 * @param rawId 原始 ID (可能是数字或短 ID 字符串)
 * @param salt 用于解码短 ID 的盐值
 * @returns 解析后的数字 ID
 * @throws {BadRequestError} 如果短 ID 无效
 */
export const resolveId = (rawId: string | number, salt: string): number => {
  if (typeof rawId === 'number') {
    return rawId;
  }
  const { decode } = createShortIdCodec(salt);
  return decode(rawId);
};
