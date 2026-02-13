import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';

export class HttpService {
  private instance: AxiosInstance;

  constructor(baseURL: string, timeout: number = 10000) {
    this.instance = axios.create({
      baseURL,
      timeout,
    });

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        logger.debug('请求拦截器:', config.url, config.params || config.data);
        return config;
      },
      (error) => {
        logger.error('请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 直接返回 data，让外层调用不用再 res.data
        return response.data;
      },
      (error) => {
        logger.error('响应拦截器错误:', error);
        return Promise.reject(error);
      }
    );
  }
  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T>{
    return this.instance.get(url, { params, ...config })
  }
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>{
    return this.instance.post(url, data, config)
  }
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>{
    return this.instance.put(url, data, config)
  }
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>{
    return this.instance.delete(url, config)
  }
}
