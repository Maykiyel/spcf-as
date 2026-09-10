import { Group, Modal } from "@mantine/core";
import { DangerButton, PrimaryButton } from "@/components/ui/button";

type ConfirmModalProps = {
  opened: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** The mutation is out. Holds the dialog open past every route that
   * would otherwise close it, so the outcome is read here rather than
   * behind a dialog that vanished. */
  loading?: boolean;
  children: React.ReactNode;
};

/**
 * A confirmation over an action that goes to the server. Owns the chrome
 * the six hand-written dialogs each restated: centred, the footer, and
 * Cancel as `DangerButton` beside a `PrimaryButton` that confirms.
 *
 * `loading` gating dismissal is the reason this exists rather than a
 * footer component. Three of those six let a click outside close them
 * mid-request, three did not, and nothing decided the split. Only
 * something owning the `Modal` can settle it for every caller.
 */
export function ConfirmModal({
  opened,
  onClose,
  title,
  confirmLabel,
  onConfirm,
  loading = false,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      // Mantine leaves this button unnamed; every dialog this replaced
      // shipped it that way, so a screen reader announced only "button".
      closeButtonProps={{ disabled: loading, "aria-label": "Close" }}
    >
      {children}

      <Group justify="flex-end" mt="lg">
        <DangerButton onClick={onClose} disabled={loading}>
          Cancel
        </DangerButton>
        <PrimaryButton loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </PrimaryButton>
      </Group>
    </Modal>
  );
}
