import { MantineProvider as BaseMantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

type MantineProviderProps = {
  children: React.ReactNode;
};

export const MantineProvider = ({ children }: MantineProviderProps) => {
  return <BaseMantineProvider>{children}</BaseMantineProvider>;
};
