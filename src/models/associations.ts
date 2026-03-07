import { Article } from './Article.model';
import { User } from './User.model';
import { Comment } from './Comment.model';
import { Tag } from './Tag.model';
import { Photo } from './Photo.model';
import { Album } from './Album.model';
import { Category } from './Category.model';
import { Image } from './Image.model';

export const initializeModelAssociations = () => {

  /**
   * 【相册】 ↔ 【图片】
   * 关系类型：一对多
   * 说明：一个相册可以包含多张图片
   */
  Album.hasMany(Photo, {
    foreignKey: 'album_id',
    as: 'photos',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【相册】 → 【封面图片】
   * 关系类型：多对一（实际上是一对一）
   * 说明：相册有一个封面图片
   */
  Album.belongsTo(Photo, {
    foreignKey: 'cover_photo_id',
    as: 'coverPhoto',
    constraints: false,
  })

  /**
   * 【照片】 → 【图片文件】
   * 关系类型：多对一
   * 说明：照片关联一个图片文件
   */
  Photo.belongsTo(Image, {
    foreignKey: 'image_id',
    as: 'image',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【文章】 → 【用户】
   * 关系类型：多对一
   * 说明：多篇文章属于一个作者
   */
  Article.belongsTo(User, {
    foreignKey: 'author_id',
    as: 'author',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【图片】 → 【相册】
   * 关系类型：多对一
   * 说明：图片必须归属于某个相册
   */
  Photo.belongsTo(Album, {
    foreignKey: 'album_id',
    targetKey: 'id',
    as: 'album',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【文章】 ↔ 【标签】
   * 关系类型：多对多
   * 中间表：post_tags
   * 说明：一篇文章可以有多个标签
   */
  Article.belongsToMany(Tag, {
    through: 'post_tags',
    foreignKey: 'post_id',
    otherKey: 'tag_id',
    as: 'tags',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【标签】 ↔ 【文章】
   * 关系类型：多对多
   * 中间表：post_tags
   * 说明：一个标签可以关联多篇文章
   */
  Tag.belongsToMany(Article, {
    through: 'post_tags',
    foreignKey: 'tag_id',
    otherKey: 'post_id',
    as: 'articles',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【文章】 ↔ 【分类】
   * 关系类型：多对多
   * 中间表：post_categories
   * 说明：一篇文章可以属于多个分类
   */
  Article.belongsToMany(Category, {
    through: 'post_categories',
    foreignKey: 'post_id',
    otherKey: 'category_id',
    as: 'categories',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【分类】 ↔ 【文章】
   * 关系类型：多对多
   * 中间表：post_categories
   * 说明：一个分类下可以有多篇文章
   */
  Category.belongsToMany(Article, {
    through: 'post_categories',
    foreignKey: 'category_id',
    otherKey: 'post_id',
    as: 'articles',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【评论】 → 【用户】
   * 关系类型：多对一
   * 说明：多个评论可以由同一个用户发布
   */
  Comment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【评论】 → 【文章】
   * 关系类型：多对一
   * 说明：一篇文章可以有多条评论
   */
  Comment.belongsTo(Article, {
    foreignKey: 'post_id',
    as: 'article',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【评论】 → 【父评论】
   * 关系类型：多对一（自关联）
   * 说明：子评论指向其父评论
   */
  Comment.belongsTo(Comment, {
    foreignKey: 'parent_id',
    as: 'parent',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  /**
   * 【评论】 → 【子评论】
   * 关系类型：一对多（自关联）
   * 说明：一条评论可以拥有多条回复
   */
  Comment.hasMany(Comment, {
    foreignKey: 'parent_id',
    as: 'replies',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
}
