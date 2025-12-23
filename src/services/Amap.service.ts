// import { HttpService } from "../utils/request";
// import { config } from "../config/index";
// import { BadRequestError } from "../utils/errors";

// interface Params {
//     key: string;
//     ip?: string;
//     city?: string;
//     cityadcode?: string;
// }
// const httpService = new HttpService(config.amap.baseUrl);

// export class AmapService {
//     // 根据用户IP获取城市信息
//     static async getCityByIp(userIp: string): Promise<any> {
//         try {
//             const testIp = "113.118.75.188";
//             const res: any = await httpService.get("/ip", {
//                 key: config.amap.apiKey,
//                 // ip: userIp // 用户IP
//                 ip: testIp
//             })

//             // 检验高德接口状态
//             if (res.status !== "1") throw new BadRequestError(`IP定位失败: ${res.info || "未知错误"}`);

//             return {
//                 province: res.province,
//                 city: res.city,
//                 adcode: res.adcode,
//                 ip: userIp,
//             }
//         } catch (error: any) {
//             console.log(error)
//             throw new BadRequestError(`IP定位失败: ${error.message}`);
//         }
//     }

//     static async getDistrict(userIp: string) {
//         try {
//             const cityInfo = await this.getCityByIp(userIp);
//             const targetCity = cityInfo.adcode; // 用adcode更可靠
//             const params = {
//                 key: config.amap.apiKey,
//                 city: targetCity, // 传入字符串（城市名或adcode）
//             };

//             const res: any = await httpService.get("/config/district", params);
//             if (res.status !== "1") {
//                 throw new Error(`地区查询失败：${res.info || "未知错误"}`);
//             }
//             return res.districts; // 返回地区数据（高德district接口的核心数据）
//         } catch (error) {
//             console.warn("地区查询失败", error);
//             throw error;
//         }
//     }
//     // 获取天气信息（根据用户ip）
//     static async getCurrentWeather(userIp: string) {
//         try {
//             // 如果未传入adcode，通过IP定位获取
//             const cityInfo = await this.getCityByIp(userIp);
//             const targetAdcode = cityInfo.adcode;

//             const params = {
//                 key: config.amap.apiKey,
//                 city: targetAdcode, // 天气接口的city参数需adcode
//             };

//             const res: any = await httpService.get("/weather/weatherInfo", params);
//             if (res.status !== "1") {
//                 throw new Error(`天气查询失败：${res.info || "未知错误"}`);
//             }
//             return res.lives[0]; // 返回当前天气（lives数组的第一个元素）
//         } catch (error) {
//             console.warn("天气查询失败", error);
//             throw error;
//         }
//     }
// }