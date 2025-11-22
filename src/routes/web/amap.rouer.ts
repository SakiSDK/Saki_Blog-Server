import { Router } from "express";
import { AmapController } from "../../controller/Amap.controller";

const router: Router = Router();

router.get('/ip', AmapController.getCityByIp)

router.get('/region', AmapController.getCityByIp)

export default router;