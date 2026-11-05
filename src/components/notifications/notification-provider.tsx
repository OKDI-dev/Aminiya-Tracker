"use client";

import { Toaster } from "sonner";
import { useIsCompact } from "@/hooks/use-media-query";

export default function NotificationProvider() {
  const compact = useIsCompact();

  return (
    <Toaster
      // Bottom on phones (thumb reach, swipe-down to dismiss), top-right on desktop.
      position={compact ? "bottom-center" : "top-right"}
      expand={false}
      richColors
      closeButton
      visibleToasts={4}
      duration={4500}
      offset={{ top: 88 }}
      mobileOffset={{ bottom: 16 }}
      toastOptions={{
        classNames: {
          toast:
            "font-sans rounded-2xl! shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]! border-black/5! squircle",
          title: "font-semibold",
          description: "text-sm",
          actionButton:
            "bg-[#171717]! text-white! font-semibold! rounded-lg! px-3!",
        },
      }}
    />
  );
}
