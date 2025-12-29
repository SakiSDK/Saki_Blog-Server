/** ---------- OSS对象存储配置对象类型 ---------- */
export type OSSConfig = {
  enable: boolean;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  endpoint: string;
  /** 对外访问基础地址 */
  baseUrl: string;
};

/** ---------- OSS对象存储配置项 ---------- */
export const config: OSSConfig = {
  enable: process.env.OSS_ENABLE === 'true',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || '',
  region: process.env.OSS_REGION || '',
  endpoint: process.env.OSS_ENDPOINT || '',
  baseUrl: process.env.OSS_BASE_URL || '',
}

export default Object.freeze(config);
