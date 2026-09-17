import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSidebarStore } from "@/stores/sidebar-store";

/** The width at which the sidebar stops being a drawer. Shared with the
 *  shell's `navbar.breakpoint` so the two cannot disagree. */
export const SIDEBAR_BREAKPOINT = "sm";

// Collapsing to a rail is a desktop affordance: below the breakpoint the
// sidebar is a drawer that is open or gone, so it always shows its labels
// and `desktopOpened` does not reach it. Matches Mantine's own min-width
// query for the same breakpoint, so 768px resolves the same on both sides.
export function useSidebarExpanded() {
  const theme = useMantineTheme();
  const desktopOpened = useSidebarStore((s) => s.desktopOpened);
  const isDesktop = useMediaQuery(
    `(min-width: ${theme.breakpoints[SIDEBAR_BREAKPOINT]})`,
    true,
    { getInitialValueInEffect: false },
  );

  return isDesktop ? desktopOpened : true;
}
