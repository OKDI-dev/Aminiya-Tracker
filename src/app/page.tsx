"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useLanguage } from "@/components/language-provider";
import { useReveal } from "@/hooks/use-reveal";
import HeroCalendar from "@/components/home/hero-calendar";
import ReportMenu from "@/components/report-menu";
import BrandRings from "@/components/brand-rings";
import LiveInGombe from "@/components/home/live-in-gombe";

export default function Home() {
  const { t } = useLanguage();
  const cardsRef = useReveal<HTMLUListElement>();

  // Each row is one large link that names its action.
  const ways = [
    {
      title: t("featureElectoralTitle"),
      description: t("featureElectoralDescription"),
      href: "/elections",
      icon: BookOpen,
      action: t("exploreElections"),
    },
    {
      title: t("featureCommunityTitle"),
      description: t("featureCommunityDescription"),
      href: "/community-issues",
      icon: MessageSquareText,
      action: t("reportCommunityIssue"),
    },
    {
      title: t("featurePromiseTitle"),
      description: t("featurePromiseDescription"),
      href: "/promise-tracker",
      icon: Target,
      action: t("trackPromises"),
    },
  ];

  // Hausa puts the whole idea in one word ("Muryarka."), so the lead-in
  // words are empty there; render them only when present.
  const heroLines = [
    { lead: t("homeHeroLine1"), accent: t("homeHeroAccent1"), tone: "text-white" },
    { lead: t("homeHeroLine2"), accent: t("homeHeroAccent2"), tone: "text-white" },
    { lead: t("homeHeroLine3"), accent: t("homeHeroAccent3"), tone: "text-signal" },
  ];

  return (
    <main data-choreographed className="min-h-screen overflow-hidden bg-paper text-ink">
      {/* Navy: the 30%. */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <BrandRings className="top-1/2 left-1/2 lg:left-[74%]" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:py-24">
          <div>
            <h1 className="font-heading text-[clamp(2.25rem,8.4vw,4rem)] leading-[0.98] font-extrabold tracking-[-0.04em] lg:text-[clamp(3.25rem,5.2vw,4.25rem)]">
              {heroLines.map((line, index) => (
                <span key={line.accent} className="hero-line" style={{ "--i": index } as CSSProperties}>
                  <span>
                    {line.lead ? (
                      <span className="text-on-ink-muted">{line.lead} </span>
                    ) : null}
                    <span className={line.tone}>{line.accent}</span>
                  </span>
                </span>
              ))}
            </h1>

            <p
              className="hero-fade mt-7 max-w-xl text-base leading-8 text-on-ink-muted sm:text-lg"
              style={{ "--d": "430ms" } as CSSProperties}
            >
              {t("homeIntro")}
            </p>

            <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--d": "530ms" } as CSSProperties}>
              <Link
                href="/elections"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 text-base font-bold text-ink transition-[background-color,scale] duration-150 hover:bg-signal-hover active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t("exploreElectoralInformation")}
                <ArrowRight size={18} className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
              </Link>

              <ReportMenu variant="hero" />
            </div>

            <ul
              className="hero-fade mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-on-ink-muted"
              style={{ "--d": "630ms" } as CSSProperties}
            >
              <li className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-signal" aria-hidden="true" />
                {t("nonpartisan")}
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-signal" aria-hidden="true" />
                {t("reviewedBeforePublishing")}
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin size={17} className="text-signal" aria-hidden="true" />
                {t("startingInGombe")}
              </li>
            </ul>
          </div>

          <div className="hero-card mx-auto w-full max-w-[460px] lg:mr-0">
            <HeroCalendar />
          </div>
        </div>
      </section>

      {/* Paper: the 60%. Three ways in, as clickable cards (static, so they can be read). */}
      <section id="our-work" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("civicParticipationTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            {t("civicParticipationDescription")}
          </p>
        </div>

        <ul ref={cardsRef} className="mt-12 grid gap-5 md:grid-cols-3">
          {ways.map((way, index) => {
            const Icon = way.icon;
            return (
              <li key={way.href} style={{ "--i": index } as CSSProperties}>
                {/* The link stays put; its surface lifts. A card that moved itself
                    would slide out from under a pointer resting on its edge. */}
                <Link
                  href={way.href}
                  className="group block h-full rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  <span className="flex h-full flex-col rounded-[22px] border border-line-soft bg-paper-raised p-6 shadow-[0_1px_2px_rgb(20_33_61/0.04)] transition-[translate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5 group-hover:border-line group-hover:shadow-[0_28px_50px_-28px_rgb(20_33_61/0.45)] group-active:translate-y-0 group-active:duration-150 motion-reduce:group-hover:translate-y-0 sm:p-7">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-signal transition-[background-color,color,rotate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-6 group-hover:bg-signal group-hover:text-ink motion-reduce:group-hover:rotate-0">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 font-heading text-xl font-bold">{way.title}</h3>
                    <span className="mt-3 flex-1 text-[15px] leading-7 text-ink-muted">{way.description}</span>
                    <span className="mt-6 flex items-center justify-between gap-3 border-t border-line-soft pt-5 text-sm font-semibold text-ink">
                      <span className="underline-offset-4 group-hover:underline">{way.action}</span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-signal text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0">
                        <ArrowRight size={17} aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Proof, not adjectives: the latest published promise and honest counts. */}
      <LiveInGombe />

      {/* Navy again for the assistant, so the page closes on the brand ground. */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 className="font-heading text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              {t("aminiyaAIHomepageTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-on-ink-muted">
              {t("aminiyaAIHomepageDescription")}
            </p>
          </div>

          <div>
            <ul className="space-y-3 text-[15px] text-white/90">
              {[t("aminiyaAIHelpOne"), t("aminiyaAIHelpTwo"), t("aminiyaAIHelpThree")].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("aminiya:open-assistant"))}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-signal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("askAminiyaAI")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
