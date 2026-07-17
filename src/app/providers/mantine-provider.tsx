import { MantineProvider as BaseMantineProvider } from "@mantine/core";
import { theme } from "@/config/theme";
import "@mantine/core/styles.css";

type MantineProviderProps = {
  children: React.ReactNode;
};

export const MantineProvider = ({ children }: MantineProviderProps) => {
  return <BaseMantineProvider theme={theme}>{children}</BaseMantineProvider>;
};
