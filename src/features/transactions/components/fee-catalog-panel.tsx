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

export function FeeCatalogPanel() {
  const { state, actions, meta } = useCatalogBuilder();

  return (
    <Stack gap="md" h="100%" style={{ minHeight: 0 }}>
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

      <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
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
      </ScrollArea>
    </Stack>
  );
}
