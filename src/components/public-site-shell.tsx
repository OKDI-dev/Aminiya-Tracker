"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";

import PublicHeader from "@/components/public-header";
import PublicFooter from "@/components/public-footer";
import { LanguageProvider } from "@/components/language-provider";
import { SWRProvider } from "@/lib/swr";
import { CommandMenuProvider } from "@/components/navigation/command-menu";
import {
  NavDirectionListener,
  PageTransition,
} from "@/components/navigation/nav-direction";

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

  return (
    // reducedMotion="user": springs drop transforms but keep opacity when the OS asks.
    <MotionConfig reducedMotion="user">
      <SWRProvider>
        <LanguageProvider>
          <CommandMenuProvider>
            <NavDirectionListener />
            {isPrivateArea ? (
              <PageTransition>{children}</PageTransition>
            ) : (
              <>
                <PublicHeader />
                <PageTransition>{children}</PageTransition>
                <PublicFooter />
              </>
            )}
          </CommandMenuProvider>
        </LanguageProvider>
      </SWRProvider>
    </MotionConfig>
  );
}
