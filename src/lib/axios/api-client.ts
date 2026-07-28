import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code: number;
}

type UnauthorizedCallback = () => void;
let onUnauthorizedCallback: UnauthorizedCallback | null = null;

export const setUnauthorizedHandler = (cb: UnauthorizedCallback) => {
  onUnauthorizedCallback = cb;
};

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  withXSRFToken: true,
});

export const getCsrfCookie = () =>
  axios.get(`${env.APP_URL}/sanctum/csrf-cookie`, { withCredentials: true });

let csrfRefreshPromise: Promise<unknown> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (!body?.success) {
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
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (status === 401) {
      onUnauthorizedCallback?.();
      return Promise.reject(error);
    }
    if (status === 419 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      csrfRefreshPromise ??= getCsrfCookie().finally(() => {
        csrfRefreshPromise = null;
      });
      await csrfRefreshPromise;
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

// Wrapper functions
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
