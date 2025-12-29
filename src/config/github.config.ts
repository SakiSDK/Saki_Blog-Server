/** ---------- GitHub 配置项类型定义 ---------- */
export type GitHubConfig = {
  /** GitHub 客户端 ID */
  clientId: string;
  /** GitHub 客户端密钥 */
  clientSecret: string;
  /** GitHub 重定向 URI */
  redirectUri: string;
};

/** ---------- GitHub 配置项 ---------- */
export const config: GitHubConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: process.env.GITHUB_REDIRECT_URI || '',
}

export default Object.freeze(config);