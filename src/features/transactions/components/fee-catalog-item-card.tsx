import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { formatCurrency } from "../lib/currency";
import type { FeeCatalogItem } from "../types";

const ADDED_STATE_DURATION_MS = 1400;

type FeeCatalogItemCardProps = {
  item: FeeCatalogItem;
  onAdd: (item: FeeCatalogItem) => void;
};

export function FeeCatalogItemCard({ item, onAdd }: FeeCatalogItemCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const revertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (revertTimeoutRef.current) {
        clearTimeout(revertTimeoutRef.current);
      }
    };
  }, []);

  const handleAdd = () => {
    onAdd(item);
    setIsAdded(true);

    if (revertTimeoutRef.current) {
      clearTimeout(revertTimeoutRef.current);
    }

    revertTimeoutRef.current = setTimeout(() => {
      setIsAdded(false);
    }, ADDED_STATE_DURATION_MS);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <FeeCatalogItemFrame
      onClick={handleAdd}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Add ${item.name} for ${formatCurrency(item.price)}`}
    >
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Group gap="xs" wrap="nowrap">
          <Text fw={600} size="sm" lineClamp={1}>
            {item.name}
          </Text>
          <Badge
            color="tertiary"
            variant="light"
            size="sm"
            style={{ shrink: 0 }}
          >
            {item.itemCode}
          </Badge>
        </Group>

        {item.description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.description}
          </Text>
        )}
      </Stack>

      <Group gap="md" wrap="nowrap" style={{ shrink: 0 }}>
        <Text fw={700} size="sm">
          {formatCurrency(item.price)}
        </Text>

        <Group
          justify="center"
          align="center"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--mantine-radius-md)",
            backgroundColor: isAdded
              ? "var(--mantine-color-teal-0)"
              : "var(--mantine-color-gray-1)",
            color: isAdded
              ? "var(--mantine-color-teal-7)"
              : "var(--mantine-color-gray-7)",
            transition: "all 150ms ease",
          }}
        >
          {isAdded ? <IconCheck size={16} /> : <IconPlus size={16} />}
        </Group>
      </Group>
    </FeeCatalogItemFrame>
  );
}

type FeeCatalogItemFrameProps = {
  children: React.ReactNode;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  role: "button";
  tabIndex: number;
  "aria-label": string;
};

function FeeCatalogItemFrame({
  children,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  "aria-label": ariaLabel,
}: FeeCatalogItemFrameProps) {
  const { ref, hovered } = useHover<HTMLDivElement>();

  return (
    <Group
      ref={ref}
      justify="space-between"
      align="center"
      wrap="nowrap"
      px="md"
      py="xs"
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      style={{
        minHeight: "4.25rem",
        border: `1px solid ${
          hovered
            ? "var(--mantine-color-gray-5)"
            : "var(--mantine-color-gray-3)"
        }`,
        borderRadius: "var(--mantine-radius-lg)",
        backgroundColor: hovered
          ? "var(--mantine-color-gray-0)"
          : "var(--mantine-color-white)",
        boxShadow: hovered ? "var(--mantine-shadow-xs)" : "none",
        transition: "all 150ms ease",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {children}
    </Group>
  );
}
