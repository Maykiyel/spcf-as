// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test/render";
import { useSidebarStore } from "@/stores/sidebar-store";
import SidebarBurger from "./sidebar-burger";

// Asserted on the store, not the shell: jsdom reports no viewport, so a
// breakpoint assertion here would pass on a broken layout.

describe("SidebarBurger", () => {
  afterEach(() => {
    useSidebarStore.setState({ mobileOpened: false });
  });

  it("opens the mobile sidebar", async () => {
    const user = userEvent.setup();
    render(<SidebarBurger />);

    await user.click(screen.getByRole("button", { name: "Toggle navigation" }));

    expect(useSidebarStore.getState().mobileOpened).toBe(true);
  });

  it("closes an open mobile sidebar", async () => {
    const user = userEvent.setup();
    useSidebarStore.setState({ mobileOpened: true });
    render(<SidebarBurger />);

    await user.click(screen.getByRole("button", { name: "Toggle navigation" }));

    expect(useSidebarStore.getState().mobileOpened).toBe(false);
  });
});
