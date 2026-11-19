"use client";

import { BookOpen, MessageSquareText, Target } from "lucide-react";
import PublicPageHero from "@/components/public-page-hero";
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
            <span className="text-signal">
              {t("aboutHeroAccent")}
            </span>
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

                  <h3 className="mt-5 font-semibold">
                    {pillar.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-ink-muted">
                    {pillar.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-line-soft bg-paper-raised p-7 sm:p-9">
          <h2 className="text-2xl font-semibold">
            {t("aboutPrinciples")}
          </h2>

          <ul className="mt-5 space-y-3 leading-7 text-ink-muted">
            {principles.map((principle, index) => (
              <li key={index}>• {principle}</li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-sm leading-6 text-ink-subtle">
          {t("aboutDevelopmentNotice")}
        </p>
      </div>
    </main>
  );
}
