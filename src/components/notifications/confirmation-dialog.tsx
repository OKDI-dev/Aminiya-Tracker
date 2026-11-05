"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { SpringDialog } from "@/components/ui/spring-dialog";
import { useIsCompact } from "@/hooks/use-media-query";

type ConfirmationOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type DialogState = ConfirmationOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmationContext = createContext<
  ((options: ConfirmationOptions) => Promise<boolean>) | null
>(null);

/**
 * Reserve confirmations for genuinely irreversible actions.
 * Reversible actions should act immediately and offer Undo (see notify.undoable).
 */
export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<DialogState | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const compact = useIsCompact();

  const settle = useCallback((result: boolean) => {
    pendingRef.current?.resolve(result);
    pendingRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      if (pendingRef.current) return Promise.resolve(false);

      return new Promise((resolve) => {
        const next: DialogState = {
          ...options,
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          resolve,
        };
        pendingRef.current = next;
        setDialog(next);
        setOpen(true);
      });
    },
    []
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) settle(false);
    },
    [settle]
  );

  const body = dialog ? (
    <div className={compact ? "px-2 pb-2" : ""}>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={() => settle(false)}
          className="min-h-11 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {dialog.cancelText}
        </button>

        <button
          type="button"
          onClick={() => settle(true)}
          className={`min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-white ${
            dialog.destructive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#ff6600] hover:bg-[#e85d00]"
          }`}
        >
          {dialog.confirmText}
        </button>
      </div>
    </div>
  ) : null;

  const title = dialog ? (
    <span className="flex items-center gap-3">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          dialog.destructive ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#ff6600]"
        }`}
      >
        <AlertTriangle size={20} aria-hidden="true" />
      </span>
      {dialog.title}
    </span>
  ) : null;

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}

      {compact ? (
        <Sheet
          open={open}
          onOpenChange={onOpenChange}
          title={title}
          description={dialog?.description}
          initialFocus={cancelButtonRef}
        >
          {body}
        </Sheet>
      ) : (
        <SpringDialog
          open={open}
          onOpenChange={onOpenChange}
          role="alertdialog"
          title={title}
          description={dialog?.description}
          className="p-6"
          initialFocus={cancelButtonRef}
        >
          {body}
        </SpringDialog>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error(
      "useConfirmation must be used inside ConfirmationProvider."
    );
  }

  return context;
}
