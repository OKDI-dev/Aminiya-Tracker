"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import { useLanguage } from "@/components/language-provider";

export default function VotingProcessPage() {
  const { t } = useLanguage();

  const preparation = [
    { title: t("vpPrep1Title"), text: t("vpPrep1Text") },
    { title: t("vpPrep2Title"), text: t("vpPrep2Text") },
    { title: t("vpPrep3Title"), text: t("vpPrep3Text") },
    { title: t("vpPrep4Title"), text: t("vpPrep4Text") },
    { title: t("vpPrep5Title"), text: t("vpPrep5Text") },
  ];

  const votingSteps = [
    { title: t("vpStep1Title"), text: t("vpStep1Text") },
    { title: t("vpStep2Title"), text: t("vpStep2Text") },
    { title: t("vpStep3Title"), text: t("vpStep3Text") },
    { title: t("vpStep4Title"), text: t("vpStep4Text") },
    { title: t("vpStep5Title"), text: t("vpStep5Text") },
    { title: t("vpStep6Title"), text: t("vpStep6Text") },
    { title: t("vpStep7Title"), text: t("vpStep7Text") },
  ];

  const postVoting = [
    [t("vpAfter1Title"), t("vpAfter1Text")],
    [t("vpAfter2Title"), t("vpAfter2Text")],
    [t("vpAfter3Title"), t("vpAfter3Text")],
    [t("vpAfter4Title"), t("vpAfter4Text")],
  ];

  const rights = [
    t("vpRight1"),
    t("vpRight2"),
    t("vpRight3"),
    t("vpRight4"),
    t("vpRight5"),
  ];

  const faqs = [
    { q: t("vpFaq1Q"), a: t("vpFaq1A") },
    { q: t("vpFaq2Q"), a: t("vpFaq2A") },
    { q: t("vpFaq3Q"), a: t("vpFaq3A") },
    { q: t("vpFaq4Q"), a: t("vpFaq4A") },
    { q: t("vpFaq5Q"), a: t("vpFaq5A") },
    { q: t("vpFaq6Q"), a: t("vpFaq6A") },
  ];

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">

        <PublicPageHero
          title={
          <>
            <span className="text-signal">{t("vpTitle")}</span>
          </>
        }
          description={
            <>
              {t("vpDescription")}
            </>
          }
          containerClassName="max-w-7xl"
          className="rounded-3xl"
        >
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-on-ink-muted">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} /> {t("vpGuide")}
            </span>
            <span>{t("vpReadTime")}</span>
          </div>
        </PublicPageHero>

        <section className="py-12">
          <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("vpWhyTitle")}
          </h2>
          <p className="mt-4 text-sm leading-8 text-ink-muted">
            {t("vpWhyText")}
          </p>
        </section>

        <section className="rounded-2xl border border-line-soft bg-paper-raised p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tint text-ink">
              <CalendarDays size={22} />
            </div>
            <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("vpBeforeTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-ink-muted">
            {t("vpBeforeText")}
          </p>
          <div className="mt-7 space-y-5">
            {preparation.map((item, index) => (
              <div key={item.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-bold text-ink">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-ink font-heading text-lg font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-ink-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <a
            href="https://www.inecnigeria.org/"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
          >
            {t("vpCheckInec")} <ExternalLink size={14} />
          </a>
        </section>

        <section className="py-14">
          <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("vpPollingTitle")}
          </h2>
          <p className="mt-3 text-ink-muted text-base leading-7">
            {t("vpPollingIntro")}
          </p>
          <div className="mt-7 space-y-4">
            {votingSteps.map((item, index) => (
              <article
                key={item.title}
                className="flex gap-4 rounded-2xl border border-line-soft bg-paper-raised p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-sm font-bold text-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-ink font-heading text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line-soft bg-paper-raised p-6 sm:p-8">
          <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("vpAfterTitle")}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {postVoting.map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-signal" size={19} />
                <div>
                  <h3 className="text-ink font-heading text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-7 text-ink-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="flex items-center gap-3">
            <ShieldCheck size={25} className="text-signal" />
            <h2 className="text-ink font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("vpRightsTitle")}
            </h2>
          </div>
          <ul className="mt-6 space-y-4">
            {rights.map((right) => (
              <li key={right} className="flex gap-3 text-sm leading-7 text-ink-muted">
                <CheckCircle2 size={19} className="mt-1 shrink-0 text-signal" />
                {right}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-ink p-6 text-white sm:p-8">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">{t("vpFaqTitle")}</h2>
          <div className="mt-6 divide-y divide-white/10">
            {faqs.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-xl text-ink group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-white/65">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-signal/20 bg-tint p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <MapPin className="text-signal" size={23} />
            <h2 className="text-ink font-heading text-xl font-bold tracking-tight">
              {t("vpOfficialTitle")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-ink-muted">
            {t("vpOfficialText")}
          </p>
          <a
            href="https://www.inecnigeria.org/"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-ink hover:bg-signal-hover"
          >
            {t("vpVisitInec")} <ExternalLink size={15} />
          </a>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6">
          <Link
            href="/electoral-information"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={16} /> {t("vpBack")}
          </Link>
          <Link
            href="/community-issues"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
          >
            {t("vpCommunity")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
