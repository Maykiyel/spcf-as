import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
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

type AccountDeactivatedCallback = (message: string) => void;
let onAccountDeactivatedCallback: AccountDeactivatedCallback | null = null;

/** Registered by AuthProvider, the same way the 401 handler is. The
 * indirection is what stops this module importing the auth layer that
 * already imports it. */
export const setAccountDeactivatedHandler = (
  cb: AccountDeactivatedCallback,
) => {
  onAccountDeactivatedCallback = cb;
};

/** `EnsureAccountIsActive` answers a deactivated user on **every**
 * endpoint, with a 403 in Laravel's plain shape (see BACKEND_NOTES.md).
 * That status is shared with per-record policy denials, which must keep
 * their own more specific handling, so the message is what tells them
 * apart.
 *
 * Matched on the phrase rather than the word "deactivated" alone. The API
 * has a third 403, "Cannot assign Series Receipt to inactive cashier
 * account", which is about somebody *else's* account on the admin's own
 * working session. It says "inactive" today and so misses a bare word
 * match by luck; the phrase does not depend on that luck.
 *
 * Returns the message rather than a boolean so the caller reports the
 * server's own copy without reaching back into the response for it. */
const DEACTIVATED_ACCOUNT = /user account is deactivated/i;

function accountDeactivatedMessage(error: AxiosError): string | null {
  if (error.response?.status !== 403) return null;
  // `POST /login` answers a deactivated user with its own version of this
  // message. There is no session to end there, and the login form already
  // shows the server's message itself, so intercepting it would sign
  // nobody out and put a second toast on screen saying the same thing.
  if (error.config?.url === "/login") return null;
  const message = (error.response.data as { message?: string } | undefined)
    ?.message;
  return typeof message === "string" && DEACTIVATED_ACCOUNT.test(message)
    ? message
    : null;
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

let csrfRefreshPromise: Promise<unknown> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

// Response interceptor
api.interceptors.response.use(handleResponseSuccess, handleResponseError);

/** Latches once a deactivation has been reported, so that a page with
 * several requests in flight produces one message rather than one per
 * request. Every one of them is rejected — `EnsureAccountIsActive` guards
 * the whole authenticated group — and the user needs to be told once. */
let deactivationReported = false;

export function handleResponseSuccess(response: AxiosResponse) {
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
  // A response got through, so the account is answering again and a later
  // deactivation is a new event rather than an echo of this one. Nothing
  // succeeds while an account is switched off, so this cannot clear the
  // latch during the burst it exists to suppress.
  deactivationReported = false;
  return response;
}

/** The response interceptor's error half, lifted out of the `use()` call
 * so it can be exercised directly. Everything it does is a session-level
 * decision made from the response alone, with no request in flight, so a
 * unit test of this function is a test of the real thing rather than of a
 * stubbed adapter. */
export async function handleResponseError(error: AxiosError) {
  const status = error.response?.status;
  const originalRequest = error.config as
    | (InternalAxiosRequestConfig & { _retry?: boolean })
    | undefined;
  if (status === 401) {
    onUnauthorizedCallback?.();
    return Promise.reject(error);
  }
  const deactivatedMessage = accountDeactivatedMessage(error);
  if (deactivatedMessage) {
    if (!deactivationReported) {
      deactivationReported = true;
      onAccountDeactivatedCallback?.(deactivatedMessage);
    }
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
}

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
