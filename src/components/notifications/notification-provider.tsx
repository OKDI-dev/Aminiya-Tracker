"use client";

import { Toaster } from "sonner";

export default function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      visibleToasts={4}
      duration={4500}
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-xl shadow-lg",
          title: "font-semibold",
          description: "text-sm",
        },
      }}
    />
  );
}
