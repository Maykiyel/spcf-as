import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";

import { useAuthStore } from "@/stores/auth-store";

export interface ApiResponse<T> {
  message: string;
  data: T;
  code: number;
  error: boolean;
}

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

//request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//response interceptor
api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body?.error) {
      return Promise.reject(
        new AxiosError(
          body.message,
          String(body.code),
          response.config,
          response.request,
          response,
        ),
      );
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

//wrapper functions
export const apiClient = {
  get: <TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<TResponse>> =>
    api.get<ApiResponse<TResponse>>(url, config).then((res) => res.data),

  post: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<TResponse>> =>
    api.post<ApiResponse<TResponse>>(url, body, config).then((res) => res.data),

  put: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<TResponse>> =>
    api.put<ApiResponse<TResponse>>(url, body, config).then((res) => res.data),

  patch: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<TResponse>> =>
    api
      .patch<ApiResponse<TResponse>>(url, body, config)
      .then((res) => res.data),

  delete: <TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<TResponse>> =>
    api.delete<ApiResponse<TResponse>>(url, config).then((res) => res.data),
};
