import { UserService } from '@/services/User.service';
import { Request, Response } from "express";



export class UserController {
  static async getUserList (req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }

  static async getUserById (req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, avatar, password, nickname, bio } = req.body;
      const user = await UserService.createUser({ email, avatar, password, nickname, bio });
      res.status(201).json({
        code: 201,
        success: true,
        message: '用户创建成功',
        data: user,
      });
    } catch (error) {
      console.log('用户创建失败', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '用户创建失败',
        data: null,
      });
    }
  }

  static async deleteUser (req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }

  static async blukDeleteUser (req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {

    } catch (error) {
      
    }
  }
}