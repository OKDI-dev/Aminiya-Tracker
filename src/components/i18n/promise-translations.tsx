"use client";

import { useLanguage } from "@/components/language-provider";

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

const sectorLabels: Record<string, { en: string; ha: string }> = {
  education: { en: "Education", ha: "Ilimi" },
  healthcare: { en: "Healthcare", ha: "Kiwon lafiya" },
  health: { en: "Health", ha: "Lafiya" },
  agriculture: { en: "Agriculture", ha: "Noma" },
  infrastructure: { en: "Infrastructure", ha: "Kayan more rayuwa" },
  water_sanitation: {
    en: "Water and sanitation",
    ha: "Ruwa da tsaftar muhalli",
  },
  roads_transport: {
    en: "Roads and transport",
    ha: "Hanyoyi da sufuri",
  },
  electricity: { en: "Electricity", ha: "Wutar lantarki" },
  security: { en: "Security", ha: "Tsaro" },
  environment: { en: "Environment", ha: "Muhalli" },
  employment: { en: "Employment", ha: "Samar da ayyukan yi" },
  youth_development: {
    en: "Youth development",
    ha: "Ci gaban matasa",
  },
  public_services: {
    en: "Public services",
    ha: "Ayyukan jama'a",
  },
  economy: { en: "Economy", ha: "Tattalin arziki" },
  other: { en: "Other", ha: "Sauran fannoni" },
};

export function LocalizedProgress({ value }: { value: string }) {
  const { language } = useLanguage();
  const label = progressLabels[value];

  return <>{label ? label[language] : value.replaceAll("_", " ")}</>;
}

export function LocalizedSector({ value }: { value: string }) {
  const { language } = useLanguage();
  const label = sectorLabels[value];

  return <>{label ? label[language] : value.replaceAll("_", " ")}</>;
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
