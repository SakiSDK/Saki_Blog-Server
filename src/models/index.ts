import { sequelize } from './sequelize';


// 导入所有模型
import { User } from './User.model';
import { Album } from './Album.model';
import { Photo } from './Photo.model';
import { Category } from './Category.model';
import { Tag } from './Tag.model';
import { Article } from './Article.model';
import { ArticleTag } from './ArticleTag.model';
import { ArticleCategory } from './ArticleCategory.model';
import { Comment } from './Comment.model';
import { Image } from './Image.model';


import { initializeModelAssociations } from './associations';

//初始化模型关联
initializeModelAssociations();

// 集中导出所有模型和sequelize实例
export {
  sequelize,
  User,
  Comment,
  Tag,
  Album,
  Image,
  Photo,
  Category,
  Article,
  ArticleTag,
  ArticleCategory,
};


export const initializeModels = async () => {
  console.log('初始化模型...')
  // 添加添加初始化逻辑，比如创建默认数据
  try {
    // 检查是否有管理员用户，如果没有就创建
    const adminCount = await User.count({ where: { role: 'admin' } })
    if (adminCount === 0) {
      await User.create({
        username: 'SakiSDK',
        password: '200444Ww..',
        role: 'admin',
        status: 'active',
        gender: 'male',
        email: 'w2729986924@gmail.com'
      })
      console.log('✅ 默认管理员用户已创建');
    }
  } catch (error) {
    console.error('初始化默认数据失败:', error);
  }
}

console.log('✅ 所有模型已导入和初始化');
