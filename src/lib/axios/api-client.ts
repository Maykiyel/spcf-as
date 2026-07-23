import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";

import { useAuthStore } from "@/stores/auth-store";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code: number;
}

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

// Dedupe concurrent CSRF refreshes if several requests 419 at once.
let csrfRefreshPromise: Promise<unknown> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

//response interceptor
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

    const isLoginRequest = originalRequest?.url?.includes("/");
    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout();
      window.location.href = "/";
      return Promise.reject(error);
    }

    // 419 = CSRF token mismatch (Laravel's default for this). Refresh the
    // XSRF cookie once and retry the original request exactly once.
    // Confirm with backend that 419 is actually what an expired/missing
    // CSRF token returns before relying on this — don't assume.
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
