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

// The server said no, and said why. Both delete flows hand-rolled a
// `Modal` to render this, which is how they lost the dismissal guards
// above — so it belongs here.
describe("ConfirmModal — holding a refusal", () => {
  it("shows the server's words in place of the body", () => {
    renderModal({ refusal: "It is referenced by existing transactions." });

    expect(
      screen.getByText("It is referenced by existing transactions."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Body copy")).not.toBeInTheDocument();
  });

  it("drops the confirm and offers only a way out", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal({ refusal: "No." });

    // Retrying fails identically until the underlying fact changes, so
    // the button that failed is taken away rather than left to be hit.
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("leaves the header's close button a distinct name from the footer's", () => {
    renderModal({ refusal: "No." });

    // Both would answer to "Close" otherwise, and a screen reader would
    // have two controls it could not tell apart.
    expect(
      screen.getByRole("button", { name: "Close dialog" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
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
