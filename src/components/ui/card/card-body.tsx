import type { ReactNode } from "react";
import { Stack } from "@mantine/core";

type CardBodyProps = {
  children: ReactNode;
  gap?: string;
};

export function CardBody({ children, gap = "md" }: CardBodyProps) {
  return (
    <Stack gap={gap} p="md" pt={0}>
      {children}
    </Stack>
  );
}
