import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/** The width at which New Transaction's three panels stop stacking. Shared
 *  with the `Grid.Col` spans and the route's height model so they cannot
 *  disagree. */
export const PANEL_LAYOUT_BREAKPOINT = "md";

// Full height with hidden overflow is only right when the three panels
// share one viewport-height row. Stacked, it caps a column whose content
// is the sum of all three, and the page cannot scroll to the Confirm
// button.
export function useSideBySidePanels() {
  const theme = useMantineTheme();

  return useMediaQuery(
    `(min-width: ${theme.breakpoints[PANEL_LAYOUT_BREAKPOINT]})`,
    true,
    { getInitialValueInEffect: false },
  );
}
