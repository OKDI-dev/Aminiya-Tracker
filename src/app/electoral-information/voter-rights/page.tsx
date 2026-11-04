"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Accessibility,
  CheckCircle2,
  ExternalLink,
  Eye,
  HandHeart,
  LockKeyhole,
  MessageSquareWarning,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import { useLanguage } from "@/components/language-provider";

function VoteIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <ShieldCheck size={size} className={className} />;
}

export default function VoterRightsPage() {
  const { t } = useLanguage();

  const rights = [
    {
      icon: VoteIcon,
      title: t("vrRight1Title"),
      description: t("vrRight1Description"),
      points: [t("vrRight1Point1"), t("vrRight1Point2"), t("vrRight1Point3")],
    },
    {
      icon: LockKeyhole,
      title: t("vrRight2Title"),
      description: t("vrRight2Description"),
      points: [t("vrRight2Point1"), t("vrRight2Point2"), t("vrRight2Point3")],
    },
    {
      icon: Scale,
      title: t("vrRight3Title"),
      description: t("vrRight3Description"),
      points: [t("vrRight3Point1"), t("vrRight3Point2"), t("vrRight3Point3")],
    },
    {
      icon: Accessibility,
      title: t("vrRight4Title"),
      description: t("vrRight4Description"),
      points: [t("vrRight4Point1"), t("vrRight4Point2"), t("vrRight4Point3")],
    },
    {
      icon: Users,
      title: t("vrRight5Title"),
      description: t("vrRight5Description"),
      points: [t("vrRight5Point1"), t("vrRight5Point2"), t("vrRight5Point3")],
    },
    {
      icon: Eye,
      title: t("vrRight6Title"),
      description: t("vrRight6Description"),
      points: [t("vrRight6Point1"), t("vrRight6Point2"), t("vrRight6Point3")],
    },
  ];

  const warningSigns = [
    t("vrWarning1"),
    t("vrWarning2"),
    t("vrWarning3"),
    t("vrWarning4"),
    t("vrWarning5"),
    t("vrWarning6"),
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">

        <PublicPageHero
          eyebrow={
            <>
              <ShieldCheck size={15} />
              {t("vrEyebrow")}
            </>
          }
          title={
          <>
            <span className="text-[#171717]">{t("vrTitle")}</span>
          </>
        }
          description={
            <>
              {t("vrDescription")}
            </>
          }
          containerClassName="max-w-7xl"
        >
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-[#777]">
            <span>{t("vrReadTime")}</span>
            <span>{t("vrCategory")}</span>
          </div>
        </PublicPageHero>

        <section className="py-12">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("vrWhyTitle")}
          </h2>
          <p className="mt-4 text-sm leading-8 text-gray-600">
            {t("vrWhyText1")}
          </p>
          <p className="mt-4 text-sm leading-8 text-gray-600">
            {t("vrWhyText2")}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("vrImportantTitle")}
          </h2>
          <div className="mt-7 space-y-5">
            {rights.map((right, index) => {
              const Icon = right.icon;
              return (
                <article
                  key={right.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#e85d00]">
                      <Icon size={23} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#e85d00]">
                        {t("vrRightLabel")} {index + 1}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-[#171717]">
                        {right.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-gray-600">
                        {right.description}
                      </p>
                      <ul className="mt-5 space-y-3">
                        {right.points.map((point) => (
                          <li key={point} className="flex gap-3 text-sm leading-7 text-gray-700">
                            <CheckCircle2
                              size={17}
                              className="mt-1 shrink-0 text-[#e85d00]"
                            />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-orange-100 bg-orange-50 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <MessageSquareWarning size={24} className="text-[#e85d00]" />
            <h2 className="text-xl font-bold text-[#171717]">
              {t("vrWarningTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {t("vrWarningIntro")}
          </p>
          <ul className="mt-5 space-y-3">
            {warningSigns.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-gray-700">
                <CheckCircle2 size={17} className="mt-1 shrink-0 text-[#e85d00]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-7 text-gray-600">
            {t("vrWarningSafety")}
          </p>
        </section>

        <section className="mt-10 rounded-2xl bg-[#171717] p-6 text-white sm:p-8">
          <div className="flex items-center gap-3">
            <HandHeart size={24} className="text-[#ff6600]" />
            <h2 className="text-2xl font-bold">{t("vrAccessTitle")}</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/70">
            {t("vrAccessText1")}
          </p>
          <p className="mt-4 text-sm leading-7 text-white/70">
            {t("vrAccessText2")}
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#171717]">
            {t("vrHelpTitle")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {t("vrHelpText")}
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <a
              href="https://www.inecnigeria.org/voters/education"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6600] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85d00]"
            >
              {t("vrInecEducation")} <ExternalLink size={15} />
            </a>
            <a
              href="https://inecnigeria.org/elections/guidelines"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#171717] hover:border-[#ff6600]"
            >
              {t("vrInecGuidelines")} <ExternalLink size={15} />
            </a>
            <a
              href="https://nass.gov.ng/documents/download/11248"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#171717] hover:border-[#ff6600]"
            >
              {t("vrElectoralAct")} <ExternalLink size={15} />
            </a>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
          <Link
            href="/electoral-information"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#e85d00]"
          >
            <ArrowLeft size={16} /> {t("vrBack")}
          </Link>
          <Link
            href="/electoral-information/voting-process"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#e85d00] hover:underline"
          >
            {t("vrNext")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
