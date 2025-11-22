import { Router } from "express";
import webRoutes from './web/index'
import adminRoutes from './admin/index'

const router: Router = Router()

router.use('/web', webRoutes)
router.use('/admin', adminRoutes)

export default router