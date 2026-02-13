export const ImageScene = {
  ARTICLE_IMAGE: 'article_image',
  ARTICLE_COVER: 'article_cover',
  ARTICLE_COVER_THUMB: 'article_cover_thumb',
  USER_AVATAR: 'user_avatar',
  ALBUM_COVER: 'album_cover',
  ALBUM_COVER_THUMB: 'album_cover_thumb',
  PHOTO_IMAGE: 'photo_image',
} as const;



export type ImageSceneType = 
  typeof ImageScene[keyof typeof ImageScene];