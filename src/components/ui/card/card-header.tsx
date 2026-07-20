import type { ReactNode } from "react";
import { Title, Group } from "@mantine/core";

type CardHeaderProps = {
  title: string;
  actions?: ReactNode; // e.g. a button on the right side of the header
};

export function CardHeader({ title, actions }: CardHeaderProps) {
  return (
    <Group justify="space-between" p="md" bg="navy.0">
      <Title order={5} c="primary">
        {title}
      </Title>
      {actions}
    </Group>
  );
}
