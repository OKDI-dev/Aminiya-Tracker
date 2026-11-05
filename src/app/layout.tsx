import type { Metadata, Viewport } from "next";
import "./globals.css";
import NotificationProvider from "@/components/notifications/notification-provider";
import { ConfirmationProvider } from "@/components/notifications/confirmation-dialog";
import PublicSiteShell from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: {
    default: "Aminiya Tracker | Your Voice. Your Community. Your Future.",
    template: "%s | Aminiya Tracker",
  },
  description:
    "Aminiya Tracker connects citizens with electoral information, community issue reporting and evidence-based political accountability, starting in Gombe State, Nigeria.",
  applicationName: "Aminiya Tracker",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Lets sheets extend under the home indicator; padding uses safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <NotificationProvider />
        <ConfirmationProvider>
          <PublicSiteShell>{children}</PublicSiteShell>
        </ConfirmationProvider>
      </body>
    </html>
  );
}
