import { config } from '../config/index'
import { MeiliSearch } from 'meilisearch'


// 创建 MeiliSearch 实例
export const meiliClient = new MeiliSearch({
    host: config.meilisearch.host,
    apiKey: config.meilisearch.apiKey
})


// 文章索引实例
export const postIndex = meiliClient.index('posts');



// 用 async 函数包裹 await 调用
const checkIndexes = async () => {
    try {
        // 获取所有索引
        const indexes = await meiliClient.getIndexes();
        console.log('所有索引：', indexes);

        // 查看指定索引的文档（以 "posts" 为例）
        const postIndex = meiliClient.index('posts'); // 替换为你的索引名
        const documents = await postIndex.getDocuments({ limit: 5 }); // 获取前5条文档
        console.log('索引中的文档：', documents);
    } catch (error: any) {
        // 捕获错误（如服务未启动、密钥错误、索引不存在等）
        console.error('查询失败：', error.message);
    }
};

// 执行函数
checkIndexes();
