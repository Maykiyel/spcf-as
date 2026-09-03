import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Group,
  Modal,
  PasswordInput,
  Radio,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { DangerButton, PrimaryButton } from "@/components/ui/button";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import {
  createUserAccount,
  createUserAccountSchema,
  type CreateUserAccountInput,
} from "../api/create-user-account";
import { USER_ACCOUNTS_QUERY_KEY } from "../api/get-user-accounts";
import { getServerFieldErrors } from "../lib/server-field-errors";

// A 422 can name a field the form doesn't have (or the API could grow one).
// Only these are settable on the form; anything else falls through to a
// toast rather than being silently swallowed. Derived from the schema
// rather than retyped, so a seventh field can't be added to one and not
// the other and quietly lose its server-side error.
const FORM_FIELDS = Object.keys(
  createUserAccountSchema.shape,
) as (keyof CreateUserAccountInput)[];

const EMPTY_FORM: CreateUserAccountInput = {
  first_name: "",
  last_name: "",
  username: "",
  password: "",
  role: "cashier",
};

type CreateAccountModalProps = {
  opened: boolean;
  onClose: () => void;
};

/**
 * Account creation is a modal, unlike the inline forms elsewhere in this app
 * that mirror the legacy system's workflow. Six fields, one submit, and a
 * return to a list that needs refreshing — the legacy workflow has nothing
 * to say about creating an account, so it isn't copied here.
 *
 * There is no edit counterpart, and there shouldn't be: the API has no
 * update endpoint, so a role picked here is permanent.
 */
export function CreateAccountModal({
  opened,
  onClose,
}: CreateAccountModalProps) {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserAccountInput>({
    resolver: zodResolver(createUserAccountSchema),
    defaultValues: EMPTY_FORM,
  });

  const closeAndReset = () => {
    reset(EMPTY_FORM);
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: createUserAccount,
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: USER_ACCOUNTS_QUERY_KEY });
      notifySuccess(`${account.full_name}'s account was created.`);
      closeAndReset();
    },
    onError: (error) => {
      const fieldErrors = getServerFieldErrors(error);
      const named = FORM_FIELDS.filter((field) => fieldErrors[field]);

      for (const field of named) {
        setError(field, { message: fieldErrors[field] });
      }

      // A duplicate username belongs on the input that caused it.
      // Anything else — a 500, a dropped connection — has no field to sit
      // under, so it surfaces the way every other failed mutation does.
      if (named.length === 0) {
        notifyMutationError(error, "Couldn't create this account.");
      }
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={closeAndReset}
      title="New Account"
      centered
      closeOnClickOutside={!createMutation.isPending}
    >
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="First Name"
                  {...field}
                  error={errors.first_name?.message}
                />
              )}
            />
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Last Name"
                  {...field}
                  error={errors.last_name?.message}
                />
              )}
            />
          </SimpleGrid>

          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <TextInput
                label="Username"
                {...field}
                error={errors.username?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordInput
                label="Password"
                {...field}
                error={errors.password?.message}
              />
            )}
          />

          {/* Radios rather than a select: the choice is between exactly two
              things and it can never be changed afterwards, so it should be
              visible on the form rather than folded into a dropdown. */}
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Radio.Group
                label="Role"
                description="Can't be changed later."
                {...field}
                error={errors.role?.message}
              >
                <Group gap="lg" mt="xs">
                  <Radio value="cashier" label="Cashier" />
                  <Radio value="admin" label="Admin" />
                </Group>
              </Radio.Group>
            )}
          />

          <Group justify="flex-end" mt="sm">
            <DangerButton
              type="button"
              onClick={closeAndReset}
              disabled={createMutation.isPending}
            >
              Cancel
            </DangerButton>
            <PrimaryButton
              type="submit"
              loading={createMutation.isPending}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Create Account
            </PrimaryButton>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
