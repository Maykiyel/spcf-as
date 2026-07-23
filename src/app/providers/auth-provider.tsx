import { Center, Loader } from "@mantine/core";
import { useAuthStore } from "@/stores/auth-store";

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === "idle") {
    if (user) {
      useAuthStore.getState().setUser(user);
    } else {
      useAuthStore.getState().setUnauthenticated();
    }
  }

  if (status === "idle" || status === "checking") {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <>{children}</>;
};
