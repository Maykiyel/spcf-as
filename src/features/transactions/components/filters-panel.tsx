import {
  Badge,
  Checkbox,
  Chip,
  Collapse,
  Group,
  Radio,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconFilter } from "@tabler/icons-react";
import { useCatalogBuilder } from "./use-catalog-builder";
import {
  PRICE_RANGE_LABELS,
  PRICE_RANGE_VALUES,
  SORT_BY_LABELS,
  SORT_BY_VALUES,
  isPriceRangeValue,
  isSortByValue,
} from "../types";

type FiltersPanelProps = {
  // True when stacked, where these filters sit between the cashier and the
  // catalog they came for.
  collapsible?: boolean;
};

export function FiltersPanel({ collapsible = false }: FiltersPanelProps) {
  const { state, actions, meta } = useCatalogBuilder();
  const [opened, { toggle }] = useDisclosure(false);

  const itemCodes = Object.keys(meta.itemCodeCounts).sort();

  // Sort is not counted: it reorders the catalog, it does not narrow it.
  const activeCount =
    state.selectedItemCodes.length + (state.priceRange === "all" ? 0 : 1);

  const body = (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text size="xs" fw={700} c="dimmed">
          ITEM CODE
        </Text>
        <Stack gap="xs">
          {itemCodes.map((itemCode) => (
            <Checkbox
              key={itemCode}
              label={
                <Group justify="space-between" gap="xl" wrap="nowrap">
                  <Text size="sm">{itemCode}</Text>
                  <Text size="sm" c="dimmed">
                    {meta.itemCodeCounts[itemCode]}
                  </Text>
                </Group>
              }
              styles={{
                body: { width: "100%" },
                labelWrapper: { width: "100%" },
              }}
              checked={state.selectedItemCodes.includes(itemCode)}
              onChange={() => actions.toggleItemCode(itemCode)}
            />
          ))}
        </Stack>
      </Stack>

      <Stack gap="xs">
        <Text size="xs" fw={700} c="dimmed">
          PRICE RANGE
        </Text>
        <Chip.Group
          multiple={false}
          value={state.priceRange}
          onChange={(value) => {
            if (isPriceRangeValue(value)) actions.setPriceRange(value);
          }}
        >
          <Group gap="xs">
            {PRICE_RANGE_VALUES.map((value) => (
              <Chip key={value} value={value} size="sm" color="primary">
                {PRICE_RANGE_LABELS[value]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Stack>

      <Stack gap="xs">
        <Text size="xs" fw={700} c="dimmed">
          SORT BY
        </Text>
        <Radio.Group
          value={state.sortBy}
          onChange={(value) => {
            if (isSortByValue(value)) actions.setSortBy(value);
          }}
        >
          <Stack gap="xs">
            {SORT_BY_VALUES.map((value) => (
              <Radio
                key={value}
                value={value}
                label={SORT_BY_LABELS[value]}
                color="primary"
              />
            ))}
          </Stack>
        </Radio.Group>
      </Stack>
    </Stack>
  );

  if (!collapsible) {
    return (
      <Stack gap="lg">
        <Group gap="xs">
          <IconFilter size={24} />
          <Title order={4}>Filters</Title>
        </Group>
        {body}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <UnstyledButton
        onClick={toggle}
        aria-expanded={opened}
        aria-controls="fee-catalog-filters"
      >
        {/* 44px: the header is the only way back to the filters on a
            phone, so it has to be a touch target, not just a heading. */}
        <Group gap="xs" wrap="nowrap" mih={44}>
          <IconFilter size={24} />
          <Title order={4}>Filters</Title>
          {/* Collapsed by default, so a filter already narrowing the
              catalog has to say so from the header. */}
          {activeCount > 0 && (
            <Badge size="sm" color="primary" circle>
              {activeCount}
            </Badge>
          )}
          <IconChevronDown
            size={20}
            style={{
              marginInlineStart: "auto",
              transform: opened ? "rotate(180deg)" : undefined,
            }}
          />
        </Group>
      </UnstyledButton>

      <Collapse expanded={opened} id="fee-catalog-filters">
        {body}
      </Collapse>
    </Stack>
  );
}
