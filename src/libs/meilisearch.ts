import { config } from '@/config';
import { Index, MeiliSearch, RecordAny, Settings } from 'meilisearch';
import { exec } from 'child_process'
import { promisify } from 'util'
import { InternalServerError } from '@/utils/errors';

const execAsync = promisify(exec);


/** MeiliSearch 客户端 */
export const meiliClient = new MeiliSearch({
  host: config.meilisearch.host,
  apiKey: config.meilisearch.apiKey,
});

// 缓存已初始化的索引，避免重复设置
const initializedIndexes = new Set<string>();

/**
 * 检查 Meilisearch 是否可用
 */
const checkMeiliHealth = async () => {
  try {
    const health = await meiliClient.health();
    if (health.status === 'available') return true;
  } catch (err) {
    return false;
  }
  return false;
};

/** 
 * 如果 Meilisearch 服务没有启动，尝试使用 brew services 启动
 */
const ensureMeiliRunning = async () => {
  const isHealthy = await checkMeiliHealth();
  if (isHealthy) return;

  console.log(`[MeiliSearch] 服务未启动，尝试自动启动...`);
  try {
    await execAsync('brew services start meilisearch');
    console.log(`[MeiliSearch] 服务已成功启动`);

    // 等待服务就绪，最多等待十秒
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      if (isHealthy) {
        console.log('[MeiliSearch] 服务已就绪');
        return;
      }
      await new Promise(res => setTimeout(res, 500)); // 500ms 检查一次
    }

    throw new InternalServerError('启动超时, Meilisearch 服务仍不可用');
  } catch (error) {
    throw new InternalServerError('无法启动 Meilisearch 服务：' + (error as any).message);
  }
};

/** 
 * 获取并可选初始化一个Meilisearch索引
 * @param indexName 索引名称
 * @param settings 索引设置，仅在首次初始化时生效
 * @returns Meilisearch Index 实例
 */
export const getMeiliIndex = async <T extends RecordAny = any>(
  indexName: string,
  settings?: Partial<Settings>
): Promise<Index<T>> => {
  // 确保服务运行
  await ensureMeiliRunning();

  // 获取索引实例（轻量，无网络请求）
  const index = meiliClient.index<T>(indexName);

  // 如果尚未初始化，则创建并配置
  if (!initializedIndexes.has(indexName)) {
    try {
      // 尝试获取索引信息，判断是否存在
      await meiliClient.getRawIndex(indexName);
    } catch (error: any) {
      // 如果索引不存在，则创建索引并设置
      // 兼容 MeiliSearchApiError 结构，部分版本错误码在 cause 中
      const errorCode = error.code || error.cause?.code;
      
      if (errorCode === 'index_not_found') {
        await meiliClient.createIndex(indexName, { primaryKey: 'id' });
      } else {
        throw error; // 其他错误（如网络、权限）直接抛出
      }
    }
    // 应用设置
    if (settings) {
      await index.updateSettings(settings);
    }

    //标记为已初始化
    initializedIndexes.add(indexName);
  }

  return index;
}