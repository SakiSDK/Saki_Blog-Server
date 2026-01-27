import Hashids from 'hashids';


/** 短ID编码解码器 */
export interface ShortIdCodec {
    encode(id: number): string;
    decode(shortId: string): number | null;
}


/** 
 * 创建ShortId编码解码器
 * @param salt 盐值
 * @param minLength 生成短ID的最小长度（默认长度）
 */
export const createShortIdCodec = (
    salt: string,
    minLength: number = 6
): ShortIdCodec => {
    const hashids = new Hashids(salt, minLength);

    return {
        encode(id: number): string {
            if (!Number.isSafeInteger(id) || id < 0) {
                throw new Error('无效 ID')
            }
            return hashids.encode(id);
        },
        decode(shortId: string): number | null {
            const decoded = hashids.decode(shortId)
            if (decoded.length === 0) return null;

            const id = decoded[0];
            if (typeof id === 'number' || !Number.isSafeInteger(id)) {
                return null;
            }
            return Number(id);
        }
    }
}