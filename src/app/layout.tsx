import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import NotificationProvider from "@/components/notifications/notification-provider";
import { ConfirmationProvider } from "@/components/notifications/confirmation-dialog";
import PublicSiteShell from "@/components/public-site-shell";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-manrope",
});

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
    <html lang="en" className={`${inter.variable} ${manrope.variable} font-sans`}>
      <body>
        <NotificationProvider />
        <ConfirmationProvider>
          <PublicSiteShell>{children}</PublicSiteShell>
        </ConfirmationProvider>
      </body>
    </html>
  );
}
