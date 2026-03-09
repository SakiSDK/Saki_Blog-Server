import { z } from 'zod'
import { UserAvatarSchema, UserBioSchema, UserEmailSchema, UserGenderSchema, UserIdSchema, UserNicknameSchema, UserPasswordSchema, UserRoleSchema, UserShortIdSchema } from './user.share'


/** ---------- 请求体 ---------- */
/** 创建用户请求体 */
export const UserCreateBodySchema = z.object({
  nickname: UserNicknameSchema,
  avatar: UserAvatarSchema.optional(),
  bio: UserBioSchema.optional(),
  gender: UserGenderSchema,
  role: UserRoleSchema,
  password: UserPasswordSchema,
})

/** ---------- 返回数据 ---------- */
/** 创建用户的返回数据 */
export const UserCreateData = {
  id: UserIdSchema,
  shortId: UserShortIdSchema,
  nickname: UserNicknameSchema,
  avatar: UserAvatarSchema,
  bio: UserBioSchema.optional(),
  email: UserEmailSchema,
}

/** ---------- 类型推导 ---------- */
/** 用户创建参数类型 */
export type UserCreateBody = z.infer<typeof UserCreateBodySchema>

/** server创建用户返回值类型 */
export type UserCreateData = z.infer<typeof UserCreateData>
