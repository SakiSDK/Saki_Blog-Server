import dotenv from 'dotenv';
import fs from 'fs'

// 先加载基础 .env (可能包含NODE_ENV)
dotenv.config({
  path: '.env'
});

// 获取当前环境变量
const env = process.env.NODE_ENV || 'development';

console.log(`当前环境变量为：${env}`);

// 加载环境专属文件
const envPath = `.env.${env}`;
if(fs.existsSync(envPath)){
  dotenv.config({
    path: envPath,
    override: true
  });
}

export { env };