import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextInput,
  PasswordInput,
  Button,
  Checkbox,
  Stack,
  Text,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { loginInputSchema, type LoginInput } from "../api/login";
import { authSession } from "../session";
import { notifyMutationError } from "@/lib/notifications/notifications";

export const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { username: "", password: "", remember_me: false },
  });

  const loginMutation = useMutation({
    mutationFn: authSession.login,
    onError: (error) => {
      const isBadCredentials =
        error instanceof AxiosError && error.response?.status === 401;
      if (!isBadCredentials) {
        notifyMutationError(error, "Couldn't log in. Please try again.");
      }
    },
  });

  const isBadCredentialsError =
    loginMutation.isError &&
    loginMutation.error instanceof AxiosError &&
    loginMutation.error.response?.status === 401;

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          placeholder="User Name"
          {...register("username")}
          error={errors.username?.message}
        />
        <PasswordInput
          placeholder="Password"
          {...register("password")}
          error={errors.password?.message}
        />
        <Checkbox label="Remember me" {...register("remember_me")} />
        <Button
          type="submit"
          fullWidth
          color="primary"
          loading={loginMutation.isPending}
        >
          Login
        </Button>
        {isBadCredentialsError && (
          <Text size="sm" c="danger" ta="center">
            Invalid username or password.
          </Text>
        )}
      </Stack>
    </form>
  );
};
