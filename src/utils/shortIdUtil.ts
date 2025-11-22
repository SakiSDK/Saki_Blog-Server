import Hashids from 'hashids'

const hashids = new Hashids('d2ac81a3285cfe2c0681c652a1a81765', 6)      // 和 Post 模型里保持一致
const hashUserIds = new Hashids('f5cc495d9c2296f01cc9df36eb8980f5', 6)  // 和 User 模型里保持一致

export class ShortIdUtil {
    public static encode(id: number): string {
        return hashids.encode(id)
    }

    public static decode(shortId: string): number[] {
        const decoded = hashids.decode(shortId)
        return decoded.map((id) => Number(id));
    }

    public static encodeUserId(id: number): string {
        return hashUserIds.encode(id)
    }

    public static decodeUserId(shortId: string): number[] {
        const decoded = hashUserIds.decode(shortId)
        console.log("decoded", decoded)
        return decoded.map((id) => Number(id));
    }
}

console.log(ShortIdUtil.encodeUserId(27))