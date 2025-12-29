/** ---------- 高德地图配置项类型定义 ---------- */
export type AMAPConfig = {
  /** 高德地图 API 密钥 */
  apiKey: string;
  /** 高德地图 API 服务地址 */
  apiUrl: string;
};


/** ---------- 高德地图配置项 ---------- */
export const config: AMAPConfig = {
  apiKey: process.env.AMAP_API_KEY || '',
  apiUrl: process.env.AMAP_BASE_URL || 'https://restapi.amap.com/v3',
}

export default Object.freeze(config);

