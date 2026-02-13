import fs from 'fs/promises';
import path from 'path'
import OSS from 'ali-oss'
import { config } from '../config/index';
import { compressImage } from './image.util';
import { deleteLocalFile, generateUniqueFilePath } from './file';
import pLimit from 'p-limit';



/** ---------- 类型定义 ---------- */
// OSS上传成功基础返回类型
export interface OSSUploadSuccessResult {
  url: string;  // OSS 访问 URL
  path: string;   // OSS文件路径
  rollback: () => Promise<void>; // 回滚函数(删除已经上传的OSS文件)
}
export type BulkUploadResult =
  | {
    success: true;
    fileName: string;
    url: string;
    path: string;
    localFilePath: string;
  }
  | {
    success: false;
    fileName: string;
    error: string;
    localFilePath: string;
  };

/** ---------- 上传到本地 ---------- */
export const uploadToLocal = async (options: {
  file: Buffer,
  fileName: string,
  mineType?: string,
}): Promise<string> => {
  try {
    const uploadDir = path.join(__dirname, '../../public/uploads');

    // 检查目录是否存在，否则创建
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, options.fileName);
    await fs.writeFile(filePath, options.file);
    return `/uploads/${options.fileName}`;
  } catch (error: any) {
    throw new Error(`文件保存失败：${error.message}`);
  }
}

/** ---------- 初始化OSS客户端 ---------- */
const ossClient = new OSS({
  region: config.oss.region,
  accessKeyId: config.oss.accessKeyId,
  accessKeySecret: config.oss.accessKeySecret,
  bucket: config.oss.bucket
})


/** ----------  批量上传本地文件到 OSS ---------- */
export const bulkUploadLocalToOSS = async (
  filePaths: string[],
  saveDir: string,
  option?: {
    concurrrency?: number;
    strict?: boolean;
    deleteLocalAfterUpload?: boolean;
  }
): Promise<BulkUploadResult[]> => {
  // 配置默认参数
  const {
    concurrrency = 5,
    strict = true,
    deleteLocalAfterUpload = false
  } = option || {};

  // 输入校验
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }

  // 并发控制器（限制同时处理文件的数量）
  const limit = pLimit(concurrrency);

  // 存储已上传成功的文件结果（用于回滚）
  const successfulUploads: Awaited<ReturnType<typeof uploadLocalToOSS>>[] = [];

  try {
    const uploadResults = await Promise.allSettled(
      filePaths.map((filePath) => limit(() => uploadLocalToOSS(filePath, saveDir)))
    )

    // 处理上传结果，分离成功/失败
    const result = uploadResults.map((settledResult, index) => {
      const filePath = filePaths[index];
      const fileName = path.basename(filePath); // 提取文件名

      if (settledResult.status === 'fulfilled') {
        const res = settledResult.value;
        successfulUploads.push({
          ...res,
          localFilePath: filePath,
        });
        return {
          success: true as const,
          fileName,
          // ...res, // 包含 url、path、rollback
          url: res.url,
          path: res.path,
          localFilePath: filePath,
        }
      } else {
        return {
          success: false as const,
          fileName,
          error: settledResult.reason.message || '文件上传失败',
          localFilePath: filePath,
        }
      }
    })
    // 7. 严格模式：有失败则回滚所有已上传文件
    if (strict) {
      const hasFailure = result.some((item) => !item.success);
      if (hasFailure) {
        await Promise.all(
          successfulUploads.map((upload) =>
            upload.rollback().catch((err) => {
              console.warn(`[批量上传回滚失败] OSS文件：${upload.path}`, err);
            })
          )
        );
        throw new Error(`批量上传失败：共 ${filePaths.length} 个文件，${successfulUploads.length} 个上传成功后回滚，${result.filter(r => !r.success).length} 个上传失败`);
      }
    }

    // 8. 可选：上传成功后删除本地文件（适合临时文件）
    if (deleteLocalAfterUpload && successfulUploads.length > 0) {
      await Promise.all(
        successfulUploads.map((upload) =>
          deleteLocalFile(upload.localFilePath)
        )
      );
      console.log(`[批量上传] 已清理 ${successfulUploads.length} 个本地文件`);
    }
    
    return result;
  } catch (error) {
    console.error(`[批量上传OSS失败] 保存目录：${saveDir}`, error);
    // 异常时回滚所有已上传文件
    await Promise.all(
      successfulUploads.map((upload) =>
        upload.rollback().catch((err) => {
          console.warn(`[批量上传异常回滚失败] OSS文件：${upload.path}`, err);
        })
      )
    );
    throw new Error(`批量上传至OSS失败：${(error as Error).message}`);
  }
}


export const uploadToOSS = async (file: Express.Multer.File, saveDir: string): Promise<OSSUploadSuccessResult> => {
  // 1️⃣ 确保文件来自 memoryStorage
  if (!file || !file.buffer) {
    throw new Error('文件 buffer 不存在，请确认使用 multer.memoryStorage()')
  }

  // 生成唯一文件名（避免重复，格式：时间戳_文件名.后缀
  const ext = path.extname(file.originalname) || 'jpg'
  // 拼接最终存储路径（OSS目录+唯一文件名）
  const uniqueName = generateUniqueFilePath(file.originalname, 'avif');

  const targetPath = `${saveDir}/${uniqueName}`
  try {
    // 压缩图片为AVIF
    const compressedBuffer = await compressImage(file.buffer);

    // OSS上传：put(OSS路径, 本地临时文件路径)
    const ossResult = await ossClient.put(targetPath, compressedBuffer);

    return {
      url: ossResult.url,
      path: targetPath,
      rollback: async () => {
        try {
          await ossClient.delete(targetPath);
          console.log(`[OSS清理] 已删除文件：${targetPath}`)
        } catch (error) {
          console.warn(`[OSS清理] 删除文件失败：${targetPath}`, error)
        }
      }
    }
  } catch (error) {
    console.error(`[OSS上传失败] ${targetPath}`, error);
    throw new Error('文件上传至OSS失败');
  }
}

/**
 * 单个本地文件上传核心逻辑（读取本地文件→压缩→上传OSS）
 * @param inputPath 本地文件绝对路径（如 '/public/uploads/temp/1.png'）
 * @param saveDir OSS 保存目录
 * @returns 单个文件上传结果（含本地路径、OSS url/path/rollback）
 */
export const uploadLocalToOSS = async (
  inputPath: string,
  saveDir: string
) => {
  // 自动适配 /uploads/... 或绝对路径
  let localFilePath = inputPath;

  // 如果是 /uploads/xxx
  if (localFilePath.startsWith('/uploads')) {
    localFilePath = path.resolve(process.cwd(), 'public' + localFilePath);
  }

  const fileName = path.basename(localFilePath);
  console.log('localFilePath: ', localFilePath);

  // 1. 校验本地文件是否存在（避免路径错误）
  try {
    const stats = await fs.stat(localFilePath);
    if (!stats.isFile()) {
      throw new Error(`路径不是文件：${localFilePath}`);
    }
  } catch (err) {
    throw new Error(`本地文件不存在或无法访问：${localFilePath}，错误：${(err as Error).message}`);
  }

  // 2. 读取本地文件为 buffer（后续压缩/上传逻辑和原函数一致）
  const fileBuffer = await fs.readFile(localFilePath);

  // 3. 生成 OSS 唯一文件名（和原 uploadToOSS 逻辑一致）
  const uniqueName = generateUniqueFilePath(fileName, 'avif');
  const ossTargetPath = `${saveDir}/${uniqueName}`;

  try {
    // 4. 压缩图片为 AVIF（复用现有压缩逻辑）
    const compressedBuffer = await compressImage(fileBuffer);

    // 5. 上传到 OSS（复用现有 OSS 上传逻辑）
    const ossResult = await ossClient.put(ossTargetPath, compressedBuffer);

    return {
      localFilePath, // 记录本地文件路径（用于后续删除）
      url: ossResult.url,
      path: ossTargetPath,
      rollback: async () => {
        try {
          await ossClient.delete(ossTargetPath);
          console.log(`[OSS批量上传回滚] 已删除文件：${ossTargetPath}`);
        } catch (error) {
          console.warn(`[OSS批量上传回滚失败] 文件：${ossTargetPath}`, error);
        }
      },
    };
  } catch (error) {
    console.error(`[单个文件上传失败] 本地路径：${localFilePath} → OSS路径：${ossTargetPath}`, error);
    throw new Error(`文件 ${fileName} 上传失败`);
  }
};

export const uploadBufferToOSS = async (buffer: Buffer, originalName: string, saveDir: string) => {
  // 生成唯一文件名
  const filename = generateUniqueFilePath(originalName, 'avif')
  const targetPath = `${saveDir}/${filename}`
  try {
    // 压缩图片成为AVIF
    const compressedBuffer = await compressImage(buffer)

    // OSS上传
    const ossResult = await ossClient.put(targetPath, compressedBuffer);

    return {
      url: ossResult.url,
      path: targetPath,
      rollback: async () => {
        try {
          await ossClient.delete(targetPath);
          console.log(`[OSS清理] 已删除文件：${targetPath}`)
        } catch (error) {
          console.warn(`[OSS清理] 删除文件失败：${targetPath}`, error)
        }
      }
    }
  } catch (error: any) {
    console.error(`[OSS上传失败] ${targetPath}`, error);
    throw new Error(`文件上传至OSS失败: ${error.message}`);
  }
}


export const deleteFile = async (path: string) => {
  if (config.oss.enable) {
    // 删除OSS文件
    await ossClient.delete(path);
    console.log(`[OSS清理] 已删除文件：${path}`)
  } else {
    await fs.unlink(path);
    console.log(`[本地清理] 已删除文件：${path}`)
  }
}
































/** ---------- 测试OSS连接使用 ---------- */
// async function testOSSConnection() {
//   try {
//     const result = await client.listBuckets({})
//     console.log('✅ OSS连接成功，您的可用Bucket如下：')
//     console.log(result)
//   } catch (error) {
//     console.error('❌ OSS连接失败：', error)
//   }
// }

// testOSSConnection()
// const simpleUploadToOSS = async (localFilePath: string, ossSavePath: string) => {
//   try {
//     const result = await ossClient.put(ossSavePath, localFilePath);
//     console.log('上传结果：', result);

//     const compressParams = 'x-oss-process=image/format,heic/quality,q_90';
//     const compressedUrl = result.url.includes('?') 
//     ? `${result.url}&${compressParams}`  // 已有参数，用&拼接
//       : `${result.url}?${compressParams}`; // 无参数，用?拼接
//     console.log(compressedUrl)
//     return compressedUrl;
//   } catch (error) {
//     console.log('上传失败：', error)
//     throw new Error('上传失败')
//   }
// }

// simpleUploadToOSS('test/test-output.webp', 'uploads/test.webp')

