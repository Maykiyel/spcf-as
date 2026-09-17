import { Burger } from "@mantine/core";
import { useSidebarStore } from "@/stores/sidebar-store";

// `hiddenFrom` matches the shell's navbar breakpoint: above it the sidebar
// is always on screen and has its own collapse control.
function SidebarBurger() {
  const { mobileOpened, toggleMobile } = useSidebarStore();

  return (
    <Burger
      opened={mobileOpened}
      onClick={toggleMobile}
      hiddenFrom="sm"
      color="white"
      size="sm"
      aria-label="Toggle navigation"
    />
  );
}

export default SidebarBurger;
