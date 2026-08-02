import { MantineProvider as BaseMantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/config/theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

type MantineProviderProps = {
  children: React.ReactNode;
};

export const MantineProvider = ({ children }: MantineProviderProps) => {
  return (
    <BaseMantineProvider theme={theme}>
      <Notifications position="bottom-center" zIndex={1000} />
      {children}
    </BaseMantineProvider>
  );
};
