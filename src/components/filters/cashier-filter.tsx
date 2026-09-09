import { Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getCashiers, cashiersQueryKey } from "@/api/cashiers";

type CashierFilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** The cashiers on record, as a picker. **Must be unmounted for a cashier,
 * not hidden**: `GET /cashiers` is a 403 for them, and holding the query
 * inside the control is what makes "not rendered" mean "never requested". */
export function CashierFilter({ value, onChange }: CashierFilterProps) {
  const cashiers = useQuery({
    queryKey: cashiersQueryKey(),
    queryFn: () => getCashiers(),
  });

  return (
    <Select
      label="Cashier"
      placeholder="All cashiers"
      data={(cashiers.data ?? []).map((cashier) => ({
        value: String(cashier.id),
        label: cashier.full_name,
      }))}
      disabled={cashiers.isLoading}
      value={value}
      onChange={onChange}
      clearable
      searchable
      w={{ base: "100%", xs: 200 }}
    />
  );
}
