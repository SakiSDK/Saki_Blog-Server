// 本地文件删除工具函数封装
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { config } from '../config/index'

export const generateUniqueFilePath = (originalName: string, ext: string) => {
  const uniqueId = randomUUID()
  const baseName = path.basename(originalName, path.extname(originalName))
  return `${uniqueId}_${baseName}.${ext}`
}

export const deleteLocalFile = async (relativePath: any): Promise<void> => {
  try {
    const safePath = relativePath.replace(/^\/+/, '') // 去掉开头的斜杠
    const fullPath = path.resolve(
      __dirname, '../../public', safePath
    )
    // 检查问价是否存在（避免删除不存在的文件报错）
    await fs.access(fullPath)
    // 执行文件删除
    await fs.unlink(fullPath);
    console.log('文件删除成功:', fullPath)
  } catch (error: any) {
    // 若文件不存在，忽略错误（避免影响后续流程）
    if (error.code === 'ENOENT') {
      console.warn(`本地文件不存在，无需删除：${relativePath}`);
      return;
    }
    // 其他错误（如权限不足）需抛出，中断流程
    throw new Error(`删除本地文件失败：${error.message}`);
  }
}


// 添加（创建）本地文件，自动生成文件名
export const createLocalFile = async (relativePath: string, content: string | Buffer, ext: string): Promise<string> => {
  try {
    console.log('文件内容：', content);
    // 生成唯一文件名
    const filename = `${randomUUID()}.${ext.replace(/^\/+/, '')}`
    // 拼接路径
    const safeDir = relativePath.replace(/^\/+/, '').replace(/\/+$/, '') // 去掉首尾斜杠
    const safePath = path.join(safeDir, filename)
    const fullPath = path.resolve(__dirname, '../../public', safePath)

    // 自动创建目录文件
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })

    // 写入文件
    await fs.writeFile(fullPath, content)

    return '/' + safePath.replace(/\\/g, '/')

  } catch (error: any) {
    throw new Error(`❌ 添加本地文件失败：${error.message}`)
  }
}

export const readLocalFile = async (filePath: string): Promise<string> => {
  try {
    // 🔧 确保拼接绝对路径
    const absolutePath = path.resolve(process.cwd(), filePath.replace(/^\//, ''))
    const content = await fs.readFile(absolutePath, 'utf-8')
    return content
  } catch (error: any) {
    console.error('读取文件失败：', error.message)
    throw new Error(`读取文件失败：${error.message}`)
  }
}