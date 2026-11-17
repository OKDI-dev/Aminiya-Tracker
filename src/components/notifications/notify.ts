import { toast } from "sonner";

type UndoableOptions = {
  message: string;
  description?: string;
  undoLabel?: string;
  /** How long the user has to change their mind. */
  duration?: number;
  /** Runs when the user presses Undo. */
  onUndo: () => void | Promise<void>;
  /**
   * Runs exactly once if the toast closes without Undo (timeout, swipe,
   * close button, or the page being hidden). Use it for deferred commits.
   */
  onCommit?: () => void | Promise<void>;
};

export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },

  error(message: string, description?: string) {
    toast.error(message, { description });
  },

  warning(message: string, description?: string) {
    toast.warning(message, { description });
  },

  info(message: string, description?: string) {
    toast.info(message, { description });
  },

  loading(message: string) {
    return toast.loading(message);
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },

  /**
   * Forgiveness over confirmation: act immediately, offer Undo.
   */
  undoable({
    message,
    description,
    undoLabel = "Undo",
    duration = 6000,
    onUndo,
    onCommit,
  }: UndoableOptions) {
    let settled = false;

    const commit = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("pagehide", commit);
      void onCommit?.();
    };

    // Never lose a deferred commit because the tab closed mid-countdown.
    if (onCommit) window.addEventListener("pagehide", commit);

    const id = toast(message, {
      description,
      duration,
      action: {
        label: undoLabel,
        onClick: () => {
          if (settled) return;
          settled = true;
          window.removeEventListener("pagehide", commit);
          void onUndo();
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    });

    return { id, commitNow: commit };
  },
};
