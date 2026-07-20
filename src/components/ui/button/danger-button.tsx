import { Button, type ButtonProps } from "@mantine/core";

export function DangerButton(
  props: ButtonProps & React.ComponentPropsWithoutRef<"button">,
) {
  return <Button color="danger" {...props} />;
}
