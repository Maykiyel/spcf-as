import { notifications as mantineNotifications } from "@mantine/notifications";
import { AxiosError } from "axios";
import { IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";

type ToastColor = "success" | "danger" | "tertiary";

type NotifyOptions = {
  title?: string;
  autoClose?: number | false;
};

const SUCCESS_AUTO_CLOSE = 4000;
const ERROR_AUTO_CLOSE = 6000;

function toastStyles(color: ToastColor) {
  return {
    root: {
      backgroundColor: `var(--mantine-color-${color}-1)`,
      borderColor: `var(--mantine-color-${color}-4)`,
    },
    title: {
      color: `var(--mantine-color-${color}-9)`,
    },
    description: {
      color: `var(--mantine-color-${color}-8)`,
    },
    closeButton: {
      color: `var(--mantine-color-${color}-8)`,
    },
  };
}

export function notifySuccess(message: string, options?: NotifyOptions) {
  mantineNotifications.show({
    color: "success",
    title: options?.title,
    message,
    icon: <IconCheck size={18} />,
    autoClose: options?.autoClose ?? SUCCESS_AUTO_CLOSE,
    withBorder: true,
    styles: toastStyles("success"),
  });
}

export function notifyError(message: string, options?: NotifyOptions) {
  mantineNotifications.show({
    color: "danger",
    title: options?.title ?? "Something went wrong",
    message,
    icon: <IconX size={18} />,
    autoClose: options?.autoClose ?? ERROR_AUTO_CLOSE,
    withBorder: true,
    styles: toastStyles("danger"),
  });
}

export function notifyWarning(message: string, options?: NotifyOptions) {
  mantineNotifications.show({
    color: "tertiary",
    title: options?.title,
    message,
    icon: <IconAlertTriangle size={18} />,
    autoClose: options?.autoClose ?? SUCCESS_AUTO_CLOSE,
    withBorder: true,
    styles: toastStyles("tertiary"),
  });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      fallback
    );
  }
  return fallback;
}

/**
 * Convenience wrapper for the common "a mutation failed" case used in
 * `onError` handlers: extract the server message (if any) and show it as
 * an error toast.
 */
export function notifyMutationError(
  error: unknown,
  fallback: string,
  title?: string,
) {
  notifyError(getErrorMessage(error, fallback), { title });
}
