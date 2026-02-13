import { Sequelize } from "sequelize";
import { config } from "../config/index";
import { logger } from "../utils/logger";

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: config.database.dialect as 'mysql' | 'postgres' | 'sqlite' | 'mssql',
  host: config.database.host,
  port: config.database.port ? config.database.port : 3306,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  logging: config.env === 'development' 
    ? (msg) => logger.debug(msg) 
    : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

// 测试连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Sequelize数据库连接成功');
    console.log('✅ Sequelize数据库连接成功')
  } catch (error) {
    logger.error('❌ Sequelize数据库连接失败', error);
    console.log('❌ Sequelize数据库连接失败')
    throw error;
  }
};

// 在导出之前添加同步函数
const syncDatabase = async (force = false) => {
  try {
    // force: true 会删除现有表并重新创建
    // alter: true 会尝试修改表结构以匹配模型
    await sequelize.authenticate()
    await sequelize.sync({ force, alter: !force });
    logger.info('✅ 数据库表同步成功');
  } catch (error) {
    logger.error('❌ 数据库表同步失败', error);
    throw error;
  }
};

export {
  sequelize,
  testConnection,
  syncDatabase
};