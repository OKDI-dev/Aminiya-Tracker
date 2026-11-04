"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export default function PublicHeader() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  const links = [
    { key: "home", href: "/" },
    { key: "electoralInformation", href: "/electoral-information" },
    { key: "communityIssues", href: "/community-issues" },
    { key: "promiseTracker", href: "/promise-tracker" },
    { key: "accountability", href: "/accountability" },
    { key: "about", href: "/about" },
  ] as const;

  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const languageSwitcher = (
    <div
      className="flex items-center gap-1 rounded-lg border border-[#e7e7e7] p-1"
      aria-label={t("language")}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
          language === "en"
            ? "bg-[#ff6600] text-white"
            : "text-[#555] hover:bg-[#fff0e5]"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => setLanguage("ha")}
        aria-pressed={language === "ha"}
        className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
          language === "ha"
            ? "bg-[#ff6600] text-white"
            : "text-[#555] hover:bg-[#fff0e5]"
        }`}
      >
        HA
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e7e7] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" aria-label="Aminiya Tracker home" className="shrink-0">
          <Image
            src="/aminiya-logo.jpg"
            alt="Aminiya Tracker"
            width={565}
            height={189}
            priority
            className="h-auto w-[165px] sm:w-[195px]"
          />
        </Link>

        <nav
          aria-label={t("mainNavigation")}
          className="hidden items-center gap-5 xl:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active(link.href) ? "page" : undefined}
              className={`text-sm transition hover:text-[#e85d00] ${
                active(link.href)
                  ? "font-semibold text-[#e85d00]"
                  : "text-[#444]"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {languageSwitcher}

          <Link
            href="/community-issues"
            className="rounded-lg bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00]"
          >
            {t("reportIssue")}
          </Link>
        </div>

        <details className="relative xl:hidden">
          <summary
            aria-label={t("openNavigation")}
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg border border-[#e7e7e7]"
          >
            <Menu size={22} />
          </summary>

          <nav
            aria-label={t("mobileNavigation")}
            className="absolute right-0 top-14 flex w-72 max-w-[calc(100vw-2.5rem)] flex-col gap-1 rounded-xl border border-[#e7e7e7] bg-white p-3 shadow-xl"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active(link.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-sm transition hover:bg-[#fff0e5] hover:text-[#d95300] ${
                  active(link.href)
                    ? "bg-[#fff0e5] font-semibold text-[#d95300]"
                    : "text-[#444]"
                }`}
              >
                {t(link.key)}
              </Link>
            ))}

            <div className="flex items-center justify-between border-t border-[#e7e7e7] pt-3">
              <span className="text-xs text-[#808080]">
                {t("language")}
              </span>
              {languageSwitcher}
            </div>

            <Link
              href="/community-issues"
              className="mt-2 rounded-lg bg-[#ff6600] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              {t("reportIssue")}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
