import { useState } from "react";

export function useCollapsiblePopover() {
  const [opened, setOpened] = useState(false);
  return { opened, setOpened };
}
