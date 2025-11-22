import { Router } from 'express'
import { AlbumController } from '../../controller/Album.controller'

const router: Router = Router()

// 相册相关接口
router.post('/', AlbumController.createAlbum)
router.get('/', AlbumController.getAdminAlbumList)
router.put('/:id', AlbumController.updateAlbum)
router.delete('/:id', AlbumController.deleteAlbum)
router.put('/:id/cover', AlbumController.setAlbumCover)

export default router