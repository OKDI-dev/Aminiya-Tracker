"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import PublicHeader from "@/components/public-header";
import PublicFooter from "@/components/public-footer";
import { LanguageProvider } from "@/components/language-provider";

export default function PublicSiteShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isPrivateArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");

  if (isPrivateArea) return <>{children}</>;

  return (
    <LanguageProvider>
      <PublicHeader />
      {children}
      <PublicFooter />
    </LanguageProvider>
  );
}
