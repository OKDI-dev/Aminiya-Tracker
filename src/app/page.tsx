"use client";

import Link from "next/link";
import HeroIllustration from "@/components/hero-illustration";
import voteIllustration from "../../public/aminiya-vote-illustration-cropped.png";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BookOpen,
  CheckCircle2,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import CivicCalendar from "@/components/civic-calendar/civic-calendar";

export default function Home() {
  const { t, language } = useLanguage();

  const features = [
    {
      number: "01",
      title: t("featureElectoralTitle"),
      description: t("featureElectoralDescription"),
      href: "/elections",
      icon: BookOpen,
      label: t("exploreElections"),
    },
    {
      number: "02",
      title: t("featureCommunityTitle"),
      description: t("featureCommunityDescription"),
      href: "/community-issues",
      icon: MessageSquareText,
      label: t("reportIssueAction"),
    },
    {
      number: "03",
      title: t("featurePromiseTitle"),
      description: t("featurePromiseDescription"),
      href: "/promise-tracker",
      icon: Target,
      label: t("trackPromises"),
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#171717]">
      <section className="relative border-b border-[#f0f0f0] bg-[#faf9f7]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div>
            <h1 className="max-w-2xl text-4xl leading-[1.12] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-[#171717]">{t("homeHeroLine1")}</span>{" "}
              <span className="text-[#ff6600]">{t("homeHeroAccent1")}</span>
              <br />
              <span className="text-[#171717]">{t("homeHeroLine2")}</span>{" "}
              <span className={language === "ha" ? "text-black" : "text-[#ff6600]"}>
                {t("homeHeroAccent2")}
              </span>
              <br />
              <span className="text-[#171717]">{t("homeHeroLine3")}</span>{" "}
              <span className="text-[#ff6600]">{t("homeHeroAccent3")}</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#626262] sm:text-lg">
              {t("homeIntro")}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/elections"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c94f00] px-6 py-3 font-semibold text-white transition hover:bg-[#a84300]"
              >
                {t("exploreElectoralInformation")}
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/community-issues"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d8d8d8] bg-white px-6 py-3 font-semibold transition hover:border-[#ff6600] hover:text-[#d95300]"
              >
                {t("reportCommunityIssue")}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#666]">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#ff6600]" />
                {t("nonpartisan")}
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-[#ff6600]" />
                {t("evidenceLed")}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={17} className="text-[#ff6600]" />
                {t("startingInGombe")}
              </span>
            </div>
          </div>

          <HeroIllustration src={voteIllustration} alt={t("voteIllustrationAlt")} />
        </div>
      </section>

      <section id="our-work" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.15em] text-[#e85d00] uppercase">
            {t("whatYouCanDo")}
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("civicParticipationTitle")}
          </h2>

          <p className="mt-4 leading-7 text-[#666]">
            {t("civicParticipationDescription")}
          </p>
        </div>

        <div className="aminiya-feature-carousel mt-10 overflow-hidden">
    <div className="aminiya-feature-track flex w-max">
      {[false, true].map((duplicate) => (
        <div
          key={duplicate ? "duplicate-features" : "original-features"}
          aria-hidden={duplicate ? true : undefined}
          className="flex shrink-0 gap-5 pr-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.number}
                className="group flex w-[min(85vw,360px)] shrink-0 flex-col rounded-2xl border border-[#e8e8e8] bg-white p-6 transition hover:-translate-y-1 hover:border-[#ffbd91] hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#fff0e5] text-[#e85d00]">
                    <Icon size={24} />
                  </div>

                  <span className="text-sm font-medium text-[#b5b5b5]">
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-7 text-[#666]">
                  {feature.description}
                </p>

                <Link
                  href={feature.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d95300] hover:text-[#a84000]"
                >
                  {feature.label}
                  <ArrowUpRight size={17} />
                </Link>
              </article>
            );

          })}
        </div>
      ))}
    </div>
  </div>
      </section>

      <section className="border-y border-[#ededed] bg-[#faf9f7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="min-w-0">
            <CivicCalendar compact />
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-[#e7e4e0] bg-white p-7 sm:p-9">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#fff0e5] text-[#e85d00]">
              <Bot size={29} />
            </div>

            <p className="mt-6 text-xs font-bold tracking-[0.15em] text-[#e85d00] uppercase">
              {t("meetAminiyaAI")}
            </p>

            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#171717]">
              {t("aminiyaAIHomepageTitle")}
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#666]">
              {t("aminiyaAIHomepageDescription")}
            </p>

            <ul className="mt-5 space-y-3 text-sm text-[#555]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#ff6600]" />
                {t("aminiyaAIHelpOne")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#ff6600]" />
                {t("aminiyaAIHelpTwo")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#ff6600]" />
                {t("aminiyaAIHelpThree")}
              </li>
            </ul>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("aminiya:open-assistant"))}
              className="mt-7 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-lg bg-[#c94f00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a84300]"
            >
              {t("askAminiyaAI")}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
