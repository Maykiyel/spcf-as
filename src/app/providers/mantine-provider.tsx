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
      {/* no-print: this portal mounts above AppRouter, so it is in the
          Print Acknowledgement Receipt page's tree too — without the
          exclusion an open toast prints onto the receipt. */}
      <Notifications
        position="bottom-center"
        zIndex={1000}
        classNames={{ root: "no-print" }}
      />
      {children}
    </BaseMantineProvider>
  );
};
