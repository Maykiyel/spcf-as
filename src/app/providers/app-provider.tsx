import { QueryProvider } from "./query-provider";
import { MantineProvider } from "./mantine-provider";
import { AuthProvider } from "./auth-provider";

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <QueryProvider>
      <MantineProvider>
        <AuthProvider>{children}</AuthProvider>
      </MantineProvider>
    </QueryProvider>
  );
};
