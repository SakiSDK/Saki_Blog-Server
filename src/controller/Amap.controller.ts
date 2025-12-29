import { AmapService } from "../services/Amap.service";
import { Request, Response } from "express";
// 工具函数：提取用户真实IP（处理代理场景）
const getClientIp = (req: Request): string => {
    const xForwardedFor = req.headers["x-forwarded-for"] as string;
    if (xForwardedFor) {
        return xForwardedFor.split(",")[0].trim(); // 取第一个IP（可能经过多层代理）
    }
    return (req.headers["x-real-ip"] as string) || (req.ip ? req.ip.replace("::ffff:", "") : "unknown");
};

export class AmapController {
    static async getCityByIp(req: Request, res: Response): Promise<void> {
        try {
            const userIp = getClientIp(req); // 获取用户真实IP
            const cityInfo = await AmapService.getCityByIp(userIp); // 传入IP
            if (!cityInfo) {
                res.status(400).json({ message: "IP定位失败" });
                return;
            }
            console.log('cityInfo: ', cityInfo);
            res.status(200).json({
                message: "获取城市成功",
                cityInfo, // 修正命名：ip → cityInfo
            });
        } catch (error) {
            res.status(500).json({ message: "服务器错误", error });
        }
    }
    static async getDistrict(req: Request, res: Response): Promise<void> {
        try {
            const userIp = getClientIp(req); // 获取用户真实IP
            const district = await AmapService.getDistrict(userIp);
            res.status(200).json({
                message: "获取地区成功",
                district,
            });
        } catch (error) {
            res.status(500).json({ message: "获取地区失败", error });
        }
    }
    static async getCurrentWeather(req: Request, res: Response): Promise<void> {
        try {
            const userIp = getClientIp(req); // 获取用户真实IP
            const weather = await AmapService.getCurrentWeather(userIp);
            console.log("weather: ", weather)
            res.status(200).json({
                message: "获取天气成功",
                weather,
            });
        } catch (error) {
            res.status(500).json({ message: "获取天气失败", error });
        }
    }
}

