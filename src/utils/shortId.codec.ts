import Hashids from 'hashids';
import { BadRequestError } from './errors';


/** 短ID编码解码器 */
export interface ShortIdCodec {
  encode(id: number): string;
  decode(shortId: string): number ;
}


/** 
 * 创建ShortId编码解码器
 * @param salt 盐值
 * @param minLength 生成短ID的最小长度（默认长度）
 * @throws {BadRequestError} 输入的ID无效
 */
export const createShortIdCodec = (
  salt: string,
  minLength: number = 6
): ShortIdCodec => {
  const hashids = new Hashids(salt, minLength);

  return {
    encode(id: number): string {
      if (!Number.isSafeInteger(id) || id < 0) {
        throw new BadRequestError('无效 ID')
      }
      return hashids.encode(id);
    },
    decode(shortId: string): number {
      const decoded = hashids.decode(shortId);
      if (decoded.length === 0) throw new BadRequestError('无效的短ID');

      const id = decoded[0];
      if (typeof id !== 'number' || !Number.isSafeInteger(id)) {
        throw new BadRequestError('无效的短ID');
      }
      return Number(id);
    }
  }
}