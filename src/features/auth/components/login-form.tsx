import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Stack,
  Text,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { login, loginInputSchema, type LoginInput } from "../api/login";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginResponse } from "../types";

type LoginFormProps = {
  onSuccess: () => void;
};

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { username: "", password: "", rememberMe: false },
  });

  const setAuth = useAuthStore((s) => s.setAuth);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data: LoginResponse, variables) => {
      setAuth(data.token, data.user, data.role, variables.rememberMe);
      onSuccess();
    },
  });

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
        <Checkbox label="Remember Me" {...register("rememberMe")} />
        <Button
          type="submit"
          fullWidth
          color="primary"
          loading={loginMutation.isPending}
        >
          Login
        </Button>
        {loginMutation.isError && (
          <Text size="sm" c="danger" ta="center">
            Invalid username or password.
          </Text>
        )}
      </Stack>
    </form>
  );
};
