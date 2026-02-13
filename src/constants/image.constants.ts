import { ImageSceneType } from './image.scene'


export const SCENE_DIR_MAP: Record<ImageSceneType, string> = {
  article_image: 'articles/images',
  article_cover: 'articles/covers/main',
  article_cover_thumb: 'articles/covers/thumb',
  user_avatar: 'users/avatars',
  album_cover: 'albums/covers/main',
  album_cover_thumb: 'albums/covers/thumb',
  photo_image: 'albums/photos'
}
