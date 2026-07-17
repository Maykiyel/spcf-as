import { QueryProvider } from "./query-provider";
import { MantineProvider } from "./mantine-provider";

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <QueryProvider>
      <MantineProvider>{children}</MantineProvider>
    </QueryProvider>
  );
};
