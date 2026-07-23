import type { ReactNode } from "react";
import { Paper, type PaperProps } from "@mantine/core";

type CardRootProps = PaperProps & {
  children: ReactNode;
};

export function CardRoot({ children, ...paperProps }: CardRootProps) {
  return (
    <Paper
      radius="md"
      shadow="sm"
      withBorder
      {...paperProps}
      style={{ overflow: "hidden", ...paperProps.style }}
    >
      {children}
    </Paper>
  );
}
