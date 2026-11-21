"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function PublicFooter() {
  const { t } = useLanguage();

  const links = [
    { label: t("about"), href: "/about" },
    { label: t("electoralInformation"), href: "/electoral-information" },
    { label: t("communityIssues"), href: "/community-issues" },
    { label: t("promiseTracker"), href: "/promise-tracker" },
    { label: t("accountability"), href: "/accountability" },
    { label: t("footerCivicCalendar"), href: "/civic-calendar" },
  ];

  return (
    <footer className="border-t border-line-soft bg-paper-raised">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 md:grid-cols-3">
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

        <div>
          <h2 className="text-sm font-semibold text-ink">
            {t("footerNavigation")}
          </h2>
          <nav
            aria-label={t("footerNavigation")}
            className="mt-4 flex flex-col items-start gap-3 text-sm text-ink-muted"
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
            <a
              href="https://okdinitiative.org"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-ink"
            >
              {t("footerVisitOkdi")}
            </a>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">
            {t("footerContact")}
          </h2>
          <div className="mt-4 space-y-3 text-sm text-ink-muted">
            <p>
              <span className="font-medium text-ink">{t("footerEmail")}: </span>
              <a
                href="mailto:info@okdinitiative.org"
                className="break-all transition hover:text-ink"
              >
                info@okdinitiative.org
              </a>
            </p>
            <p>
              <span className="font-medium text-ink">{t("footerPhone")}: </span>
              <a
                href="tel:+2347044354546"
                className="transition hover:text-ink"
              >
                +234 704 435 4546
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line-soft px-5 py-5 text-center text-xs text-ink-subtle">
        © 2026 Aminiya Tracker. {t("footerCopyright")}
      </div>
    </footer>
  );
}
