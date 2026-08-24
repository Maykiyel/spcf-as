import {
  Checkbox,
  Chip,
  Group,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { useCatalogBuilder } from "./use-catalog-builder";
import {
  PRICE_RANGE_LABELS,
  PRICE_RANGE_VALUES,
  SORT_BY_LABELS,
  SORT_BY_VALUES,
  isPriceRangeValue,
  isSortByValue,
} from "../types";

export function FiltersPanel() {
  const { state, actions, meta } = useCatalogBuilder();

  const itemCodes = Object.keys(meta.itemCodeCounts).sort();

  return (
    <Stack gap="lg">
      <Group gap="xs">
        <IconFilter size={24} />
        <Title order={4}>Filters</Title>
      </Group>

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
}
