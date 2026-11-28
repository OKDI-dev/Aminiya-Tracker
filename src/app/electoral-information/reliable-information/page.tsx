"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Globe,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import { useLanguage } from "@/components/language-provider";

export default function ReliableInformationPage() {
  const { t } = useLanguage();

  const checks = [
    { title: t("riStep1Title"), text: t("riStep1Text") },
    { title: t("riStep2Title"), text: t("riStep2Text") },
    { title: t("riStep3Title"), text: t("riStep3Text") },
    { title: t("riStep4Title"), text: t("riStep4Text") },
    { title: t("riStep5Title"), text: t("riStep5Text") },
  ];

  const warningSigns = [
    t("riWarning1"),
    t("riWarning2"),
    t("riWarning3"),
    t("riWarning4"),
    t("riWarning5"),
  ];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-ink/5 bg-paper-raised">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <Link
            href="/electoral-information"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft size={16} />
            {t("riBack")}
          </Link>
        </div>
      </section>

      <PublicPageHero
        title={t("riHeroTitle")}
        description={t("riHeroDescription")}
        containerClassName="max-w-7xl"
      >
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-on-ink-muted">
          <span>{t("riReadTime")}</span>
          <span>•</span>
          <span>{t("riTopicVerification")}</span>
          <span>•</span>
          <span>{t("riTopicSharing")}</span>
        </div>
      </PublicPageHero>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_280px]">
        <article className="min-w-0 space-y-10">
          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">{t("riWhyTitle")}</h2>
            <p className="mt-4 leading-8 text-ink-muted">{t("riWhyText1")}</p>
            <p className="mt-4 leading-8 text-ink-muted">{t("riWhyText2")}</p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">{t("riStepsTitle")}</h2>
            <div className="mt-6 space-y-4">
              {checks.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-ink/5 bg-paper-raised p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-bold text-ink">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-ink-muted">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-signal/25 bg-tint/60 p-6">
            <div className="flex items-center gap-3">
              <TriangleAlert className="text-signal" size={24} />
              <h2 className="font-heading text-xl font-bold tracking-tight">{t("riWarningsTitle")}</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              {t("riWarningsIntro")}
            </p>
            <ul className="mt-5 space-y-3">
              {warningSigns.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-6 text-ink-muted"
                >
                  <TriangleAlert
                    size={16}
                    className="mt-1 shrink-0 text-signal"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">{t("riSourcesTitle")}</h2>
            <p className="mt-4 leading-8 text-ink-muted">{t("riSourcesIntro")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a
                href="https://www.inecnigeria.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-ink/5 bg-paper-raised p-5 transition hover:border-signal"
              >
                <Globe className="text-signal" size={22} />
                <h3 className="mt-3 font-heading text-lg font-bold">{t("riInecTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {t("riInecDescription")}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  {t("riVisitWebsite")} <ExternalLink size={14} />
                </span>
              </a>

              <a
                href="https://www.inecnigeria.org/voters/education"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-ink/5 bg-paper-raised p-5 transition hover:border-signal"
              >
                <FileSearch className="text-signal" size={22} />
                <h3 className="mt-3 font-heading text-lg font-bold">{t("riVoterEducationTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {t("riVoterEducationDescription")}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  {t("riExploreResources")} <ExternalLink size={14} />
                </span>
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-ink/5 bg-paper-raised p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-signal" size={24} />
              <h2 className="font-heading text-xl font-bold tracking-tight">{t("riShareTitle")}</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-ink-muted">
              {["riShare1", "riShare2", "riShare3", "riShare4"].map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <CheckCircle2
                    size={17}
                    className="mt-1 shrink-0 text-signal"
                  />
                  {t(key as
                    | "riShare1"
                    | "riShare2"
                    | "riShare3"
                    | "riShare4")}
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-ink/10 pt-6">
            <Link
              href="/electoral-information"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
            >
              <ArrowLeft size={16} />
              {t("riBackToInformation")}
            </Link>
          </div>
        </article>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-ink/5 bg-paper-raised p-5">
            <h3 className="font-heading text-lg font-bold">{t("riSidebarTitle")}</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              <li>{t("riSidebar1")}</li>
              <li>{t("riSidebar2")}</li>
              <li>{t("riSidebar3")}</li>
              <li>{t("riSidebar4")}</li>
              <li>{t("riSidebar5")}</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-ink p-5 text-white">
            <Search size={24} className="text-signal" />
            <h3 className="mt-4 font-heading text-lg font-bold">{t("riPauseTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {t("riPauseText")}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
