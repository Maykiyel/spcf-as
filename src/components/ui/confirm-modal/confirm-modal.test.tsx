// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test/render";
import { ConfirmModal } from "./confirm-modal";

// Seam: the component's own interface. What it renders for a given
// `loading`, and which of the four ways out of a Mantine Modal it still
// honours. The dismissal cases are the reason this component exists
// rather than a footer, so they are what these pin.

function renderModal(props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmModal
      opened
      onClose={onClose}
      title="Delete item code"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      {...props}
    >
      <p>Body copy</p>
    </ConfirmModal>,
  );
  return { onClose, onConfirm };
}

describe("ConfirmModal", () => {
  it("renders its title, body and both actions", () => {
    renderModal();

    expect(screen.getByText("Delete item code")).toBeInTheDocument();
    expect(screen.getByText("Body copy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("reports a confirm and a cancel through their own callbacks", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

});

// A Mantine Modal has four ways out: the two buttons, Escape, the close
// button, and a click on the overlay. While the mutation is out, none of
// them may fire — a dialog that vanishes mid-request takes the outcome
// with it. Three of the six dialogs this replaced guarded only the
// overlay, and nothing decided that.
describe("ConfirmModal — while loading", () => {
  it("disables both footer buttons", () => {
    renderModal({ loading: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    // Mantine renders a loader in place of the label and marks the button
    // `data-loading`; it stays in the accessibility tree, disabled.
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("ignores Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ loading: true });

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables the close button", () => {
    renderModal({ loading: true });

    expect(screen.getByRole("button", { name: /close/i })).toBeDisabled();
  });

  it("still closes on Escape once the mutation settles", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ loading: false });

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
