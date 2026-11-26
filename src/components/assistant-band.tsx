"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/**
 * The navy band that closes every public page above the footer, as on the
 * home page: the brand ground plus the way to ask Aminiya AI for help.
 * Rendered once by PublicSiteShell, so pages don't add it themselves.
 */
export default function AssistantBand() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="assistant-band-title" className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <h2
            id="assistant-band-title"
            className="font-heading text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl"
          >
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
  );
}
