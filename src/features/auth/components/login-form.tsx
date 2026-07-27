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
import { login, loginInputSchema, type LoginInput } from "../api/login";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "../types";

export const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { username: "", password: "", remember_me: false },
  });

  const setUser = useAuthStore((s) => s.setUser);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user: AuthUser) => {
      setUser(user);
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
        <Checkbox label="Remember me" {...register("remember_me")} />
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
