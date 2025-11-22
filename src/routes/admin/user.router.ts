import { Router } from 'express'
import { UserController } from '../../controller/User.controller'

const router: Router = Router()

// 获取用户列表
router.get('/', UserController.getUserList)
// 获取用户详情
router.get('/:id', UserController.getUserById)
// 创建用户
router.post('/', UserController.createUser)
// 更新用户
router.put('/:id', UserController.updateUser)
// 删除用户
router.delete('/:id', UserController.deleteUser)
// 管理员重置密码
router.put('/:id/reset-password', UserController.resetPassword)
// 管理员修改密码
router.post('/change-password', UserController.changePassword)
// 获取用户统计信息
router.get('/stats', UserController.getUserStats)

export default router