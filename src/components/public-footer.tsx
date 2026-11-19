"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function PublicFooter() {
  const { t } = useLanguage();

  const links = [
    { label: t("about"), href: "/about" },
    {
      label: t("electoralInformation"),
      href: "/electoral-information",
    },
    { label: t("communityIssues"), href: "/community-issues" },
    { label: t("promiseTracker"), href: "/promise-tracker" },
    { label: t("accountability"), href: "/accountability" },
    { label: t("footerCivicCalendar"), href: "/civic-calendar" },
  ];

  return (
    <footer className="border-t border-line-soft bg-paper-raised">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Image
            src="/aminiya-logo-png.png"
            alt="Aminiya Tracker"
            width={565}
            height={189}
            className="h-auto w-[165px]"
          />

          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-subtle">
            {t("footerDescription")}
          </p>
        </div>

        <nav
          aria-label={t("footerNavigation")}
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-ink-muted"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-line-soft px-5 py-5 text-center text-xs text-ink-subtle">
        © 2026 Aminiya Tracker. {t("footerCopyright")}
      </div>
    </footer>
  );
}
