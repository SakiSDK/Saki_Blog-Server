import { z } from 'zod';
import { zEmail, zId, zStr } from '../base.schema';


/** 用户ID */
export const UserIdSchema = zId.describe('用户ID')
/** 用户shortId */
export const UserShortIdSchema = z.string().length(6, '短ID长度必须为6个字符').describe('用户短ID')
/** 用户GitHub登录ID */
export const UserGithubIdSchema = zStr.describe('用户GitHub登录ID')
/** 用户谷歌登录ID */
export const UserGoogleIdSchema = zStr.describe('用户谷歌登录ID')
/** 用户QQ登录ID */
export const UserQqIdSchema = zStr.describe('用户QQ登录ID')
/** 用户昵称 */
export const UserNicknameSchema = zStr.max(20, '昵称长度不能超过20个字符').describe('用户昵称')
/** 用户头像 */
export const UserAvatarSchema = zStr.url('头像必须是一个URL').describe('用户头像')
/** 用户头像路径 */
export const UserAvatarPathSchema = zStr.describe('用户头像路径')
/** 用户简介 */
export const UserBioSchema = zStr.max(100, '简介长度不能超过100个字符').describe('用户简介')
/** 用户性别 */
export const UserGenderSchema = z.enum(['male', 'female', 'other'], '性别必须是male、female或other').describe('用户性别')
/** 用户权限 */
export const UserRoleSchema = z.enum(['user', 'admin'], '权限必须是user或admin').describe('用户权限')
/** 用户密码 */
export const UserPasswordSchema = zStr.min(6, '密码长度不能小于6个字符').describe('用户密码')
/** 用户邮箱 */
export const UserEmailSchema = zEmail.describe('用户邮箱')