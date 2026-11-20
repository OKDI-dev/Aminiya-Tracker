import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePublicData } from "@/lib/swr";

/** Give up on the events request after this long and offer Try again. */
const LOAD_TIMEOUT_MS = 15_000;

/**
 * Shared SWR key: the home hero and the calendar section ask for the same
 * list, so they share one request. The `public:` prefix lets the cache
 * persist it, so returning visitors see last-known events instantly.
 */
const CACHE_KEY = "public:civic-events";

/**
 * Set NEXT_PUBLIC_DEMO_CIVIC_EVENTS=true (e.g. in .env.local) to mix
 * sample events into the public calendar for design and QA work. They are
 * dated relative to today, never written to the database, and never cached.
 */
const DEMO_EVENTS_ENABLED = process.env.NEXT_PUBLIC_DEMO_CIVIC_EVENTS === "true";

export type CivicEvent = {
  id: string;
  title_en: string;
  title_ha: string;
  description_en: string;
  description_ha: string;
  category: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_en: string | null;
  venue_ha: string | null;
  registration_url: string | null;
};

export const categoryLabels: Record<string, { en: string; ha: string }> = {
  civic_education: { en: "Civic education", ha: "Ilimin wayar da kan jama'a" },
  electoral: { en: "Electoral", ha: "Zaɓe" },
  community_engagement: { en: "Community engagement", ha: "Shiga cikin al'umma" },
  youth: { en: "Youth", ha: "Matasa" },
  accountability: { en: "Accountability", ha: "Riƙon amana" },
  other: { en: "Other", ha: "Sauran ayyuka" },
};

export function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/*
 * Browsers ship little or no Hausa date data, so `Intl` with "ha-NG" quietly
 * falls back to English ("December", "4:00 PM"). Hausa names are written out
 * here, like the hand-translated weekdays, and Hausa times use 24-hour clock.
 */
const hausaMonths = [
  "Janairu", "Fabrairu", "Maris", "Afirilu", "Mayu", "Yuni",
  "Yuli", "Agusta", "Satumba", "Oktoba", "Nuwamba", "Disamba",
];
const hausaShortMonths = [
  "Jan", "Fab", "Mar", "Afi", "May", "Yun", "Yul", "Agu", "Sat", "Okt", "Nuw", "Dis",
];

export function formatDate(value: string, language: "en" | "ha") {
  const date = dateFromKey(value);
  if (language === "ha") {
    return `${date.getDate()} ${hausaShortMonths[date.getMonth()]} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * A compact day range: "22–23 Nov", "30 Nov – 2 Dec", with the year only
 * when the range isn't in the current year.
 */
export function formatDateRange(start: string, end: string, language: "en" | "ha") {
  const a = dateFromKey(start);
  const b = dateFromKey(end);
  const month = (d: Date) =>
    language === "ha"
      ? hausaShortMonths[d.getMonth()]
      : new Intl.DateTimeFormat("en-NG", { month: "short" }).format(d);
  const year = b.getFullYear() !== new Date().getFullYear() ? ` ${b.getFullYear()}` : "";

  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${month(b)}${year}`;
  }
  return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}${year}`;
}

/** Long form for screen-reader labels, e.g. "19 November 2026". */
export function formatLongDate(date: Date, language: "en" | "ha") {
  if (language === "ha") {
    return `${date.getDate()} ${hausaMonths[date.getMonth()]} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(date);
}

export function formatShortMonth(value: string, language: "en" | "ha") {
  const date = dateFromKey(value);
  if (language === "ha") return hausaShortMonths[date.getMonth()];
  return new Intl.DateTimeFormat("en-NG", { month: "short" }).format(date);
}

export function formatTime(value: string, language: "en" | "ha") {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (language === "ha") {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMonth(date: Date, language: "en" | "ha") {
  if (language === "ha") return `${hausaMonths[date.getMonth()]} ${date.getFullYear()}`;
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Monday-first grid for a month, padded to whole weeks. */
export function getCalendarDates(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    return new Date(year, monthIndex, index - offset + 1);
  });
}

/** Every day an event covers, keyed by YYYY-MM-DD. */
export function groupEventsByDate(events: CivicEvent[]) {
  const grouped = new Map<string, CivicEvent[]>();

  for (const event of events) {
    const start = dateFromKey(event.start_date);
    const end = dateFromKey(event.end_date || event.start_date);

    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = dateKey(cursor);
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, existing);
    }
  }

  return grouped;
}

/** Events still running on or after `today`, soonest first. */
export function upcomingFrom(events: CivicEvent[], today: string, limit: number) {
  return events
    .filter((event) => (event.end_date || event.start_date) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);
}

async function fetchPublishedEvents(): Promise<CivicEvent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("civic_events")
    .select(
      "id,title_en,title_ha,description_en,description_ha,category,start_date,end_date,start_time,end_time,venue_en,venue_ha,registration_url"
    )
    .eq("status", "published")
    .order("start_date", { ascending: true })
    .limit(300)
    .abortSignal(AbortSignal.timeout(LOAD_TIMEOUT_MS));

  if (error) {
    console.error("Unable to load civic events:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as CivicEvent[];
}

/**
 * Published civic events, shared across every component on the page.
 * `loading` is true only while there is nothing to show yet; `error` only
 * when the request failed and no cached events are available.
 */
export function useCivicEvents() {
  const { data, error, isFirstLoad, isValidating, mutate } = usePublicData<CivicEvent[]>(
    CACHE_KEY,
    fetchPublishedEvents,
    { revalidateOnFocus: false }
  );

  const events = useMemo(() => {
    const real = data ?? [];
    if (!DEMO_EVENTS_ENABLED || data === undefined) return real;
    return [...real, ...demoCivicEvents(new Date())].sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
  }, [data]);

  return {
    events,
    loading: isFirstLoad,
    error: Boolean(error) && data === undefined,
    retrying: isValidating && Boolean(error),
    retry: () => void mutate(),
  };
}

/* ------------------------------------------------------------------
   Demo events (opt-in, see DEMO_EVENTS_ENABLED)
------------------------------------------------------------------- */

type DemoSeed = {
  /** Days from today; negative is in the past. */
  offset: number;
  /** Extra days the event runs for. */
  span?: number;
  category: keyof typeof categoryLabels;
  en: string;
  ha: string;
  venue: string;
  time?: [string, string];
};

const demoSeeds: DemoSeed[] = [
  { offset: -4, category: "civic_education", en: "Know Your Polling Unit clinic", ha: "Asibitin Sanin Rumfar Zaɓenka", venue: "Gombe Central Library", time: ["10:00", "13:00"] },
  { offset: 0, category: "community_engagement", en: "Ward 4 town hall on water supply", ha: "Taron gari na Unguwa ta 4 kan samar da ruwa", venue: "Pantami Town Hall", time: ["16:00", "18:00"] },
  { offset: 2, category: "youth", en: "Youth civic hackathon", ha: "Gasar fasahar matasa ta harkokin jama'a", venue: "Gombe Innovation Hub", span: 1, time: ["09:00", "17:00"] },
  { offset: 5, category: "electoral", en: "Continuous voter registration drive", ha: "Rajistar masu zaɓe mai ci gaba", venue: "INEC Office, Gombe", span: 2, time: ["08:30", "15:00"] },
  { offset: 8, category: "accountability", en: "Budget tracking walk-through: Q3 projects", ha: "Bibiyar kasafin kuɗi: ayyukan kwata na uku", venue: "Online (Zoom)", time: ["14:00", "15:30"] },
  { offset: 11, category: "civic_education", en: "Women in politics roundtable", ha: "Taron mata a siyasa", venue: "Federal University Kashere", time: ["11:00", "13:30"] },
  { offset: 11, category: "community_engagement", en: "Clean-up and road safety day", ha: "Ranar tsabtace muhalli da kiyaye hadura", venue: "Tudun Wada roundabout", time: ["07:00", "10:00"] },
  { offset: 16, category: "electoral", en: "Candidate debate: State Assembly", ha: "Muhawarar 'yan takara: Majalisar Jiha", venue: "Gombe Stadium Hall", time: ["17:00", "19:30"] },
  { offset: 22, category: "youth", en: "Student union voter education tour", ha: "Rangadin wayar da kan ɗalibai kan zaɓe", venue: "Gombe State University", span: 3 },
  { offset: 29, category: "accountability", en: "Promise tracker public review", ha: "Bitar jama'a kan bibiyar alƙawura", venue: "Aminiya Hub, Gombe", time: ["10:00", "12:00"] },
  { offset: 36, category: "civic_education", en: "Fact-checking workshop for local media", ha: "Bitar tantance labarai ga kafafen yaɗa labarai", venue: "NUJ Secretariat, Gombe", time: ["09:30", "14:00"] },
  { offset: 44, category: "electoral", en: "Mock election day for first-time voters", ha: "Ranar gwajin zaɓe ga sababbin masu zaɓe", venue: "Billiri Local Government", time: ["08:00", "14:00"] },
  { offset: 53, category: "community_engagement", en: "Health centre community scorecard", ha: "Katin tantance cibiyar lafiya ta al'umma", venue: "Kaltungo PHC", time: ["10:00", "12:30"] },
  { offset: 61, category: "other", en: "Aminiya open day", ha: "Ranar buɗe ƙofa ta Aminiya", venue: "Aminiya Hub, Gombe", time: ["10:00", "16:00"] },
];

function shiftDate(base: Date, days: number) {
  return dateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
}

function demoCivicEvents(today: Date): CivicEvent[] {
  return demoSeeds.map((seed, index) => ({
    id: `demo-${index}`,
    title_en: `${seed.en} (demo)`,
    title_ha: `${seed.ha} (gwaji)`,
    description_en: "Sample event shown because demo events are switched on.",
    description_ha: "Misalin aiki ne domin an kunna ayyukan gwaji.",
    category: seed.category,
    start_date: shiftDate(today, seed.offset),
    end_date: seed.span ? shiftDate(today, seed.offset + seed.span) : null,
    start_time: seed.time?.[0] ?? null,
    end_time: seed.span ? null : (seed.time?.[1] ?? null),
    venue_en: seed.venue,
    venue_ha: seed.venue,
    registration_url: null,
  }));
}
