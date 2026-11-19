"use client";

import CommunityIssues from "@/components/community-issues/community-issues";
import PublicPageHero from "@/components/public-page-hero";
import { useLanguage } from "@/components/language-provider";

export default function CommunityIssuesPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <PublicPageHero
        title={
          <>
            {t("communityHeroTitleFirst")}{" "}
            <span className="text-signal">
              {t("communityHeroTitleSecond")}
            </span>
          </>
        }
        description={t("communityPageDescription")}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <CommunityIssues />
      </div>
    </main>
  );
}
