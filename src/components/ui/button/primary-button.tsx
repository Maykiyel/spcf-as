import { Button, type ButtonProps } from "@mantine/core";

export function PrimaryButton(
  props: ButtonProps & React.ComponentPropsWithoutRef<"button">,
) {
  return <Button color="primary" {...props} />;
}
