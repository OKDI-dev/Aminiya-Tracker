"use client";

import Image from "next/image";
import {
  BookOpen,
  MessageSquareText,
  Target,
} from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
import ContactForm from "@/components/contact-form";
import { useLanguage } from "@/components/language-provider";

export default function AboutPage() {
  const { t } = useLanguage();

  const pillars = [
    {
      title: t("aboutPillarElectoralTitle"),
      description: t("aboutPillarElectoralDescription"),
      icon: BookOpen,
    },
    {
      title: t("aboutPillarCommunityTitle"),
      description: t("aboutPillarCommunityDescription"),
      icon: MessageSquareText,
    },
    {
      title: t("aboutPillarPromiseTitle"),
      description: t("aboutPillarPromiseDescription"),
      icon: Target,
    },
  ];

  const principles = [
    t("aboutPrinciple1"),
    t("aboutPrinciple2"),
    t("aboutPrinciple3"),
    t("aboutPrinciple4"),
    t("aboutPrinciple5"),
  ];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <PublicPageHero
        title={
          <>
            {t("aboutHeroTitle")}
            <br />
            <span className="text-signal">{t("aboutHeroAccent")}</span>
          </>
        }
        description={t("aboutHeroDescription")}
      />

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <section>
          <h2 className="text-2xl font-semibold">
            {t("aboutWhatPlatformDoes")}
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;

              return (
                <article
                  key={index}
                  className="rounded-2xl border border-line-soft bg-paper-raised p-6"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-tint text-ink">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-5 font-semibold">{pillar.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-ink-muted">
                    {pillar.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-line-soft bg-paper-raised p-7 sm:p-9">
          <h2 className="text-2xl font-semibold">{t("aboutPrinciples")}</h2>

          <ul className="mt-5 space-y-3 leading-7 text-ink-muted">
            {principles.map((principle, index) => (
              <li key={index}>• {principle}</li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-signal">
              {t("aboutAcknowledgementTitle")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {t("aboutPartnershipTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-ink-muted">
              {t("aboutAcknowledgementText")}
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              {t("aboutPartnershipText")}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-line-soft bg-white p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-24 w-full max-w-xs items-center justify-center sm:h-28">
                  <Image
                    src="/okdi-logo.png"
                    alt="Open Knowledge Development Initiative (OKDI)"
                    width={500}
                    height={250}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">OKDI</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {t("aboutOkdiRole")}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-24 w-full max-w-xs items-center justify-center sm:h-28">
                  <Image
                    src="/nyff-logo.png"
                    alt="Nigeria Youth Futures Fund (NYFF)"
                    width={500}
                    height={250}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">NYFF</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {t("aboutNyffRole")}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-ink-muted">
            {t("aboutPartnershipInvitation")}
          </p>
        </section>

        <p className="mt-10 text-sm leading-6 text-ink-subtle">
          {t("aboutDevelopmentNotice")}
        </p>

        <section
          id="contact"
          className="mt-14 scroll-mt-24 rounded-2xl border border-line-soft bg-paper-raised p-7 sm:p-9"
        >
          <div className="mb-7 max-w-2xl">
            <h2 className="text-2xl font-semibold">
              {t("aboutContactTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              {t("aboutContactDescription")}
            </p>
          </div>

          <ContactForm />
        </section>
      </div>
    </main>
  );
}
