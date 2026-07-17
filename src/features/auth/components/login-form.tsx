import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Stack,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { login, loginInputSchema, type LoginInput } from "../api/login";

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

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess,
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
          loading={loginMutation.isPending}
          
        >
          Login
        </Button>
        {loginMutation.isError && (
          <p style={{ color: "red", fontSize: 14 }}>
            Invalid username or password.
          </p>
        )}
      </Stack>
    </form>
  );
};
