import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NumberInput, Select, Group, SimpleGrid, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Card } from "@/components/ui/card";
import { PrimaryButton, DangerButton } from "@/components/ui/button";
import { IconRefresh, IconDeviceFloppy } from "@tabler/icons-react";
import {
  notifySuccess,
  notifyMutationError,
  notifyWarning,
} from "@/lib/notifications/notifications";
import { getCashiers } from "../api/get-cashiers";
import { getLatestFrom } from "../api/get-latest-from";
import {
  createSeriesReceipt,
  seriesReceiptInputSchema,
  type SeriesReceiptFormInput,
  type SeriesReceiptInputFields,
} from "../api/create-series-receipt";
import {
  computeToFromSheets,
  computeSheetsFromTo,
  buildCreatePayload,
  isStaleFromError,
} from "../lib/series-receipt-form-logic";

const DEFAULT_VALUES = { cashierId: 0, sheets: 1 };

export function SeriesReceiptForm() {
  const queryClient = useQueryClient();

  const cashiersQuery = useQuery({
    queryKey: ["cashiers"],
    queryFn: getCashiers,
  });

  const latestFromQuery = useQuery({
    queryKey: ["series-receipts", "latest-from"],
    queryFn: getLatestFrom,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SeriesReceiptFormInput, unknown, SeriesReceiptInputFields>({
    resolver: zodResolver(seriesReceiptInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const sheets = watch("sheets") as number;
  const from = latestFromQuery.data;

// "to" is display-only; editing it writes the derived sheet count back into the real field.
  const [toDraft, setToDraft] = useState<number | null>(null);
  const [pendingFields, setPendingFields] =
    useState<SeriesReceiptInputFields | null>(null);
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  useEffect(() => {
    if (from === undefined) return;
    setToDraft(computeToFromSheets(from, sheets || 1));
  }, [from, sheets]);

  const handleToChange = (value: number | string) => {
    if (from === undefined) return;
    const nextTo = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(nextTo)) return;
    setToDraft(nextTo);
    setValue("sheets", computeSheetsFromTo(from, nextTo), {
      shouldValidate: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: createSeriesReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series-receipts"] });
      notifySuccess("Series receipt was created.");
      reset(DEFAULT_VALUES);
      latestFromQuery.refetch();
    },
    onError: (error) => {
      const isStale =
        error instanceof AxiosError &&
        error.response?.status === 422 &&
        isStaleFromError(error.response.data);

      if (isStale) {
        latestFromQuery.refetch();
        notifyWarning(
          "Someone else just created a series — the numbers were refreshed. Please review and submit again.",
        );
        return;
      }

      notifyMutationError(error, "Couldn't create this series receipt.");
    },
  });

  const submitNow = (fields: SeriesReceiptInputFields) => {
    if (from === undefined) return;
    createMutation.mutate(
      buildCreatePayload({
        cashierId: fields.cashierId,
        from,
        sheets: fields.sheets,
      }),
    );
  };

  const onSubmit = (fields: SeriesReceiptInputFields) => {
    if (from === undefined) return;
    setPendingFields(fields);
    openConfirm();
  };

  const handleConfirmCreate = () => {
    closeConfirm();
    if (pendingFields) submitNow(pendingFields);
    setPendingFields(null);
  };

  const handleCancelConfirm = () => {
    closeConfirm();
    setPendingFields(null);
  };

  const handleCancel = () => reset(DEFAULT_VALUES);

  const cashierOptions =
    cashiersQuery.data?.map((c) => ({
      value: String(c.id),
      label: c.full_name,
    })) ?? [];

  const pendingCashierName = cashiersQuery.data?.find(
    (c) => c.id === pendingFields?.cashierId,
  )?.full_name;
  const pendingTo =
    from !== undefined && pendingFields
      ? computeToFromSheets(from, pendingFields.sheets)
      : null;

  return (
    <>
      <Card.Root>
        <Card.Header title="Add Series Receipt" />
        <Card.Divider />
        <Card.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Controller
                name="cashierId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Cashier"
                    placeholder="Select a cashier"
                    data={cashierOptions}
                    disabled={cashiersQuery.isLoading}
                    value={field.value ? String(field.value) : null}
                    onChange={(val) => field.onChange(val ? Number(val) : 0)}
                    error={errors.cashierId?.message}
                  />
                )}
              />

              <NumberInput
                label="From"
                value={from ?? ""}
                disabled
                readOnly
              />

              <NumberInput
                label="To"
                min={from ?? 1}
                allowDecimal={false}
                value={toDraft ?? ""}
                onChange={handleToChange}
                disabled={from === undefined}
              />

              <Controller
                name="sheets"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Number of Sheets"
                    min={1}
                    allowDecimal={false}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    error={errors.sheets?.message}
                  />
                )}
              />
            </SimpleGrid>

            {from !== undefined && toDraft !== null && (
              <Text size="sm" c="dimmed" mt="xs">
                Creates receipts numbered {from}–{toDraft} · {sheets || 0}{" "}
                sheets
              </Text>
            )}

            <Group justify="flex-end" mt="lg">
              <DangerButton
                type="button"
                onClick={handleCancel}
                leftSection={<IconRefresh size={16} />}
              >
                Cancel
              </DangerButton>
              <PrimaryButton
                type="submit"
                loading={createMutation.isPending}
                disabled={from === undefined}
                leftSection={<IconDeviceFloppy size={16} />}
              >
                Save
              </PrimaryButton>
            </Group>
          </form>
        </Card.Body>
      </Card.Root>

      <Modal
        opened={confirmOpen}
        onClose={handleCancelConfirm}
        title="Confirm series receipt"
        centered
      >
        <Text size="sm">
          Creates receipts numbered{" "}
          <strong>
            {from}–{pendingTo}
          </strong>{" "}
          · <strong>{pendingFields?.sheets}</strong> sheets for{" "}
          <strong>{pendingCashierName}</strong>. Is this correct?
        </Text>
        <Group justify="flex-end" mt="lg">
          <DangerButton onClick={handleCancelConfirm}>Cancel</DangerButton>
          <PrimaryButton
            loading={createMutation.isPending}
            onClick={handleConfirmCreate}
          >
            Confirm
          </PrimaryButton>
        </Group>
      </Modal>
    </>
  );
}
