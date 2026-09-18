import type { ReactNode } from "react";
import { Title, Group } from "@mantine/core";

type CardHeaderProps = {
  title: string;
  actions?: ReactNode; // e.g. a button on the right side of the header
};

export function CardHeader({ title, actions }: CardHeaderProps) {
  return (
    <Group justify="space-between" p="md" bg="navy.0">
      {/* `anywhere`: the Service Breakdown's title carries a free-form,
          admin-entered service name, which can be one long unbroken token
          normal wrapping would not break. */}
      <Title order={5} c="primary" style={{ overflowWrap: "anywhere" }}>
        {title}
      </Title>
      {actions}
    </Group>
  );
}
