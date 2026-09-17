import { Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getActors, actorsQueryKey } from "@/api/actors";

type PerformedByFilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** Every account, not just cashiers — most entries are an admin's.
 * **Unmounted for a cashier, not hidden**: `GET /users` is a 403 for them,
 * and holding the query here is what makes that true. */
export function PerformedByFilter({ value, onChange }: PerformedByFilterProps) {
  const actors = useQuery({
    queryKey: actorsQueryKey(),
    queryFn: getActors,
  });

  return (
    <Select
      label="Performed By"
      // No System option: those entries carry a null actor id.
      placeholder="Anyone"
      data={(actors.data ?? []).map((actor) => ({
        value: String(actor.id),
        label: actor.full_name,
      }))}
      disabled={actors.isLoading}
      value={value}
      onChange={onChange}
      clearable
      searchable
      w={{ base: "100%", xs: 220 }}
    />
  );
}
