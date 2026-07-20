import { Button, type ButtonProps } from "@mantine/core";
import { IconPencilFilled } from "@tabler/icons-react";

export function EditButton(
  props: ButtonProps & React.ComponentPropsWithoutRef<"button">,
) {
  return (
    <Button
      color="tertiary"
      leftSection={<IconPencilFilled size={14} />}
      {...props}
    >
      {props.children ?? "Edit"}
    </Button>
  );
}
