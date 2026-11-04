"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Handshake,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import { useLanguage } from "@/components/language-provider";

export default function CivicResponsibilityPage() {
  const { t } = useLanguage();

  const sections = [
  {
    icon: Users,
    title: t("crS1Title"),
    text: t("crS1Text"),
    points: [
      t("crS1P1"),
      t("crS1P2"),
      t("crS1P3"),
    ],
  },
  {
    icon: MessageSquare,
    title: t("crS2Title"),
    text: t("crS2Text"),
    points: [
      t("crS2P1"),
      t("crS2P2"),
      t("crS2P3"),
    ],
  },
  {
    icon: FileText,
    title: t("crS3Title"),
    text: t("crS3Text"),
    points: [
      t("crS3P1"),
      t("crS3P2"),
      t("crS3P3"),
    ],
  },
  {
    icon: Handshake,
    title: t("crS4Title"),
    text: t("crS4Text"),
    points: [
      t("crS4P1"),
      t("crS4P2"),
      t("crS4P3"),
    ],
  },
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
            {t("crElectoralInformation")}
          </Link>

        </div>
      </section>

      <PublicPageHero
        eyebrow={t("crEyebrow")}
        title={
          <>
            {t("crTitleStart")}
            <br />
            <span className="text-[#ff6600]">{t("crTitleEnd")}</span>
          </>
        }
        description={
          <>
            {t("crDescription")}
          </>
        }
        containerClassName="max-w-7xl"
      >
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#777]">
          <span>{t("crReadTime")}</span>
          <span>•</span>
          <span>{t("crCommunity")}</span>
          <span>•</span>
          <span>{t("crAccountability")}</span>
        </div>
      </PublicPageHero>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_280px]">
        <article className="min-w-0 space-y-10">
          <section>
            <h2 className="text-2xl font-bold">{t("crWhyTitle")}</h2>
            <p className="mt-4 leading-8 text-[#666]">
              {t("crWhyText1")}
            </p>
            <p className="mt-4 leading-8 text-[#666]">
              {t("crWhyText2")}
            </p>
          </section>

          <section className="space-y-7">
            <h2 className="text-2xl font-bold">
              {t("crWaysTitle")}
            </h2>
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="rounded-2xl border border-black/5 bg-white p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-[#fff0e6] p-3 text-[#ff6600]">
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#ff6600]">
                        0{index + 1}
                      </span>
                      <h3 className="mt-1 text-lg font-bold">
                        {section.title}
                      </h3>
                      <p className="mt-3 leading-7 text-[#666]">
                        {section.text}
                      </p>
                      <ul className="mt-4 space-y-3">
                        {section.points.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-2 text-sm leading-6 text-[#555]"
                          >
                            <CheckCircle2
                              size={17}
                              className="mt-1 shrink-0 text-[#ff6600]"
                            />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-[#ffe0cc] bg-[#fff8f2] p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#ff6600]" size={24} />
              <h2 className="text-xl font-bold">
                {t("crSafetyTitle")}
              </h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[#555]">
              <li>• {t("crSafety1")}</li>
              <li>• {t("crSafety2")}</li>
              <li>• {t("crSafety3")}</li>
              <li>• {t("crSafety4")}</li>
              <li>• {t("crSafety5")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("crContinueTitle")}</h2>
            <p className="mt-4 leading-8 text-[#666]">
              {t("crContinueText")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/community-issues"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00]"
              >
                {t("crExploreIssues")} <ArrowRight size={16} />
              </Link>
              <Link
                href="/promises"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#ff6600]"
              >
                {t("crTrackPromises")} <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <div className="border-t border-black/10 pt-6">
            <Link
              href="/electoral-information"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6600] hover:underline"
            >
              <ArrowLeft size={16} />
              {t("crBack")}
            </Link>
          </div>
        </article>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <h3 className="font-bold">{t("crGuideTitle")}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#666]">
              <li>{t("crGuide1")}</li>
              <li>{t("crGuide2")}</li>
              <li>{t("crGuide3")}</li>
              <li>{t("crGuide4")}</li>
              <li>{t("crGuide5")}</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-[#171717] p-5 text-white">
            <Users size={24} className="text-[#ff6600]" />
            <h3 className="mt-4 font-bold">{t("crVoiceTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {t("crVoiceText")}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
