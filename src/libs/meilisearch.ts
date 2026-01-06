import { config } from '@/config';
import { Index, MeiliSearch, RecordAny, Settings } from 'meilisearch';


/** MeiliSearch 客户端 */
export const meiliClient = new MeiliSearch({
  host: config.meilisearch.host,
  apiKey: config.meilisearch.apiKey,
});

// 缓存已初始化的索引，避免重复设置
const initializedIndexes = new Set<string>();

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
  // 获取索引实例（轻量，无网络请求）
  const index = meiliClient.index<T>(indexName);

  // 如果尚未初始化，则创建并配置
  if (!initializedIndexes.has(indexName)) {
    try {
      // 尝试获取索引信息，判断是否存在
      await meiliClient.getRawIndex(indexName);
    } catch (error: any) {
      // 如果索引不存在，则创建索引并设置
      if (error.code === 'index_not_found') {
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