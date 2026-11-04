"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";

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

export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingDialogRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback((result: boolean) => {
    setDialog((current) => {
      if (!current) return null;
      current.resolve(result);
      return null;
    });
    pendingDialogRef.current = false;
  }, []);

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      if (pendingDialogRef.current) {
        return Promise.resolve(false);
      }

      pendingDialogRef.current = true;
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      return new Promise((resolve) => {
        setDialog({
          ...options,
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          resolve,
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!dialog) return;

    confirmButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = [
        cancelButtonRef.current,
        confirmButtonRef.current,
      ].filter(
        (element): element is HTMLButtonElement =>
          element !== null && !element.disabled
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      window.requestAnimationFrame(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      });
    };
  }, [dialog, close]);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#ff6600]">
                <AlertTriangle size={23} aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Close confirmation dialog"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6600]"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <h2
              id={titleId}
              className="mt-5 text-lg font-bold text-[#171717]"
            >
              {dialog.title}
            </h2>

            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-gray-600"
            >
              {dialog.description}
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6600]"
              >
                {dialog.cancelText}
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  dialog.destructive
                    ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
                    : "bg-[#ff6600] hover:bg-[#e85d00] focus-visible:outline-[#ff6600]"
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </section>
        </div>
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
