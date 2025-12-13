import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    validated?: any; // 可根据需要替换为更具体的类型
  }
}