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
    <main className="min-h-screen bg-[#f7f8f5] text-[#171717]">
      <section className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <Link
            href="/electoral-information"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#666] transition hover:text-[#ff6600]"
          >
            <ArrowLeft size={16} />
            {t("riBack")}
          </Link>
        </div>
      </section>

      <PublicPageHero
        eyebrow={t("riEyebrow")}
        title={t("riHeroTitle")}
        description={t("riHeroDescription")}
        containerClassName="max-w-7xl"
      >
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#777]">
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
            <h2 className="text-2xl font-bold">{t("riWhyTitle")}</h2>
            <p className="mt-4 leading-8 text-[#666]">{t("riWhyText1")}</p>
            <p className="mt-4 leading-8 text-[#666]">{t("riWhyText2")}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("riStepsTitle")}</h2>
            <div className="mt-6 space-y-4">
              {checks.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-black/5 bg-white p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0e6] text-sm font-bold text-[#ff6600]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#666]">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#ffe0cc] bg-[#fff8f2] p-6">
            <div className="flex items-center gap-3">
              <TriangleAlert className="text-[#ff6600]" size={24} />
              <h2 className="text-xl font-bold">{t("riWarningsTitle")}</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#666]">
              {t("riWarningsIntro")}
            </p>
            <ul className="mt-5 space-y-3">
              {warningSigns.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-6 text-[#555]"
                >
                  <TriangleAlert
                    size={16}
                    className="mt-1 shrink-0 text-[#ff6600]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("riSourcesTitle")}</h2>
            <p className="mt-4 leading-8 text-[#666]">{t("riSourcesIntro")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a
                href="https://www.inecnigeria.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-black/5 bg-white p-5 transition hover:border-[#ff6600]"
              >
                <Globe className="text-[#ff6600]" size={22} />
                <h3 className="mt-3 font-bold">{t("riInecTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-[#666]">
                  {t("riInecDescription")}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
                  {t("riVisitWebsite")} <ExternalLink size={14} />
                </span>
              </a>

              <a
                href="https://www.inecnigeria.org/voters/education"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-black/5 bg-white p-5 transition hover:border-[#ff6600]"
              >
                <FileSearch className="text-[#ff6600]" size={22} />
                <h3 className="mt-3 font-bold">{t("riVoterEducationTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-[#666]">
                  {t("riVoterEducationDescription")}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600]">
                  {t("riExploreResources")} <ExternalLink size={14} />
                </span>
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#ff6600]" size={24} />
              <h2 className="text-xl font-bold">{t("riShareTitle")}</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[#555]">
              {["riShare1", "riShare2", "riShare3", "riShare4"].map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <CheckCircle2
                    size={17}
                    className="mt-1 shrink-0 text-[#ff6600]"
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

          <div className="border-t border-black/10 pt-6">
            <Link
              href="/electoral-information"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <ArrowLeft size={16} />
              {t("riBackToInformation")}
            </Link>
          </div>
        </article>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <h3 className="font-bold">{t("riSidebarTitle")}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#666]">
              <li>{t("riSidebar1")}</li>
              <li>{t("riSidebar2")}</li>
              <li>{t("riSidebar3")}</li>
              <li>{t("riSidebar4")}</li>
              <li>{t("riSidebar5")}</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-[#171717] p-5 text-white">
            <Search size={24} className="text-[#ff6600]" />
            <h3 className="mt-4 font-bold">{t("riPauseTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {t("riPauseText")}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
