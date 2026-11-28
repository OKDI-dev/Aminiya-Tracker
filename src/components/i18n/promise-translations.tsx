"use client";

import { useLanguage } from "@/components/language-provider";
import { sectorLabel } from "@/lib/promise-sectors";

export function LocalizedText({
  en,
  ha,
}: {
  en: string;
  ha: string;
}) {
  const { language } = useLanguage();
  return <>{language === "ha" ? ha : en}</>;
}

const progressLabels: Record<string, { en: string; ha: string }> = {
  not_started: { en: "Not started", ha: "Ba a fara ba" },
  in_progress: { en: "In progress", ha: "Ana kan aiki" },
  partially_fulfilled: {
    en: "Partially fulfilled",
    ha: "An cika wani ɓangare",
  },
  fulfilled: { en: "Fulfilled", ha: "An cika" },
  stalled: { en: "Stalled", ha: "An dakatar" },
};

export function LocalizedProgress({ value }: { value: string }) {
  const { language } = useLanguage();
  const label = progressLabels[value];

  return <>{label ? label[language] : value.replaceAll("_", " ")}</>;
}

export function LocalizedSector({ value }: { value: string }) {
  const { language } = useLanguage();
  return <>{sectorLabel(value, language)}</>;
}

export function LocalizedDate({
  value,
}: {
  value: string | null;
}) {
  const { language } = useLanguage();

  if (!value) {
    return <>{language === "ha" ? "Ba a bayyana ba" : "Not specified"}</>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <>{language === "ha" ? "Ba a bayyana ba" : "Not specified"}</>;
  }

  return (
    <>
      {new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)}
    </>
  );
}
