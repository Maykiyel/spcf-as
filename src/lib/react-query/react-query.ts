import {
  type UseMutationOptions,
  type DefaultOptions,
} from "@tanstack/react-query";
import { AxiosError } from "axios";

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry client errors (4xx) — retrying a 404 or 422 won't fix it
      if (error instanceof AxiosError && error.response?.status) {
        const status = error.response.status;
        if (status >= 400 && status < 500) return false;
      }
      // Retry other failures (network errors, 5xx) up to 2 times
      return failureCount < 2;
    },
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions;

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> =
  Awaited<ReturnType<FnType>>;

export type QueryConfig<T extends (...args: any[]) => any> = Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>;

export type MutationConfig<
  MutationFnType extends (...args: any) => Promise<any>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
