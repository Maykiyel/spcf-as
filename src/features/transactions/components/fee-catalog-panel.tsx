import {
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Group,
} from "@mantine/core";
import { IconListSearch, IconSearch } from "@tabler/icons-react";
import { useCatalogBuilder } from "./use-catalog-builder";
import { FeeCatalogItemCard } from "./fee-catalog-item-card";

type FeeCatalogPanelProps = {
  // True in the side-by-side desktop layout, where this panel fills its
  // column and scrolls internally. False when stacked, where it must size
  // to its own content instead so the page scrolls as one document.
  fillHeight?: boolean;
};

export function FeeCatalogPanel({ fillHeight = true }: FeeCatalogPanelProps) {
  const { state, actions, meta } = useCatalogBuilder();

  const items = (
    <Stack gap="sm">
      {meta.isCatalogLoading ? (
        <Group justify="center" py="lg">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading fee catalog...
          </Text>
        </Group>
      ) : meta.isCatalogError ? (
        <Text size="sm" c="danger" ta="center" py="lg">
          Couldn't load the fee catalog. Please try again.
        </Text>
      ) : meta.filteredCatalog.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          No fees match your search or filters.
        </Text>
      ) : (
        meta.filteredCatalog.map((item) => (
          <FeeCatalogItemCard
            key={item.id}
            item={item}
            onAdd={actions.addFeeItem}
          />
        ))
      )}
    </Stack>
  );

  return (
    <Stack
      gap="md"
      h={fillHeight ? "100%" : undefined}
      style={fillHeight ? { minHeight: 0 } : undefined}
    >
      <Group gap="xs">
        <IconListSearch size={24} />
        <Title order={4}>Fee Catalog</Title>
      </Group>

      <TextInput
        placeholder="Search fees..."
        leftSection={<IconSearch size={16} />}
        value={state.search}
        onChange={(event) => actions.setSearch(event.currentTarget.value)}
      />

      {fillHeight ? (
        <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
          {items}
        </ScrollArea>
      ) : (
        items
      )}
    </Stack>
  );
}
