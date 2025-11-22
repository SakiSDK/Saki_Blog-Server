import { Post, User, Comment, Tag, Photo, Album, Category } from './index'

export const initializeModelAssociations = () => { 
    // 用户和相册的一对多关系
    Album.hasMany(Photo, {
        foreignKey: 'album_id',
        as: 'photos',
    })
    Post.belongsTo(User, {
        foreignKey: 'author_id',
        as: 'author',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 相册和图片的一对多关系
    Photo.belongsTo(Album, {
        foreignKey: 'album_id',
        targetKey: 'id',
        as: 'album',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    })
    
    // 文章 & 标签 多对多
    Post.belongsToMany(Tag, {
        through: 'post_tags',
        foreignKey: 'post_id',
        otherKey: 'tag_id',
        as: 'tags',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 标签 & 文章 多对多
    Tag.belongsToMany(Post, {
        through: 'post_tags',
        foreignKey: 'tag_id',
        otherKey: 'post_id',
        as: 'posts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 文章 & 分类 多对多
    Post.belongsToMany(Category, {
        through: 'post_categories',
        foreignKey: 'post_id',
        otherKey: 'category_id',
        as: 'categories',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 分类 & 文章 多对多
    Category.belongsToMany(Post, {
        through: 'post_categories',
        foreignKey: 'category_id',
        otherKey: 'post_id',
        as: 'posts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 评论 <-> 用户（多对一：多个评论属于一个用户）
    Comment.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 评论 <-> 文章（多对一：多个评论属于一个文章）
    Comment.belongsTo(Post, {
        foreignKey: 'post_id',
        as: 'post',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 评论 <-> 评论（一对多：一个评论有多个子评论）
    Comment.belongsTo(Comment, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })

    // 评论 <-> 父评论（自关联：多对一）
    Comment.hasMany(Comment, {
        foreignKey: 'parent_id',
        as: 'replies',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
}