"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";

type CivicEvent = {
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

const categoryLabels: Record<string, { en: string; ha: string }> = {
  civic_education: { en: "Civic education", ha: "Ilimin wayar da kan jama'a" },
  electoral: { en: "Electoral", ha: "Zaɓe" },
  community_engagement: { en: "Community engagement", ha: "Shiga cikin al'umma" },
  youth: { en: "Youth", ha: "Matasa" },
  accountability: { en: "Accountability", ha: "Riƙon amana" },
  other: { en: "Other", ha: "Sauran ayyuka" },
};

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string, language: "en" | "ha") {
  return new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateFromKey(value));
}

function formatTime(value: string, language: "en" | "ha") {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMonth(date: Date, language: "en" | "ha") {
  return new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getCalendarDates(month: Date) {
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


function EventCard({
  event,
  language,
}: {
  event: CivicEvent;
  language: "en" | "ha";
}) {
  const title = language === "ha" ? event.title_ha : event.title_en;
  const description =
    language === "ha" ? event.description_ha : event.description_en;
  const venue = language === "ha" ? event.venue_ha : event.venue_en;
  const category =
    categoryLabels[event.category]?.[language] ?? categoryLabels.other[language];

  const eventDate = dateFromKey(event.start_date);

  return (
    <article className="group rounded-2xl border border-[#e7e4e0] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#ffbd91] hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex size-[58px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff0e5] text-[#a84300]">
          <span className="text-[10px] font-bold uppercase">
            {new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
              month: "short",
            }).format(eventDate)}
          </span>
          <span className="text-xl font-bold leading-6">
            {eventDate.getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-[#fff3eb] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#a84300]">
            {category}
          </span>

          <h3 className="mt-2 text-base font-semibold leading-6 text-[#171717]">
            {title}
          </h3>

          {description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#595959]">
              {description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#595959]">
            {event.end_date && event.end_date !== event.start_date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {formatDate(event.start_date, language)} – {formatDate(event.end_date, language)}
              </span>
            )}

            {event.start_time && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {formatTime(event.start_time, language)}
                {event.end_time ? ` – ${formatTime(event.end_time, language)}` : ""}
              </span>
            )}

            {venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                {venue}
              </span>
            )}
          </div>

          {event.registration_url && (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a84300] transition hover:text-[#803300]"
            >
              {language === "ha" ? "Ƙarin bayani / Rajista" : "Details / Registration"}
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CivicCalendar({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("2000-01-01");
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(2000, 0, 1)
  );

  useEffect(() => {
    const currentDate = new Date();
    const currentKey = dateKey(currentDate);

    // Initialize the calendar from the browser date after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(currentKey);
    setSelectedDate(currentKey);
    setDisplayedMonth(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("civic_events")
        .select(
          "id,title_en,title_ha,description_en,description_ha,category,start_date,end_date,start_time,end_time,venue_en,venue_ha,registration_url"
        )
        .eq("status", "published")
        .order("start_date", { ascending: true })
        .limit(300);

      if (!active) return;

      if (queryError) {
        setError(true);
        setEvents([]);
      } else {
        setEvents((data ?? []) as CivicEvent[]);
      }

      setLoading(false);
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const text = {
    en: {
      eyebrow: "Stay informed",
      title: "Civic Calendar",
      description: "Explore upcoming civic activities, public engagements, educational programmes and important community dates.",
      loading: "Loading civic calendar...",
      error: "We couldn't load the calendar right now. Please try again later.",
      empty: "No events scheduled for this day.",
      emptyHint: "Select another date or explore upcoming activities.",
      upcoming: "Upcoming activities",
      noUpcoming: "There are no upcoming activities at the moment.",
      today: "Today",
      previous: "Previous month",
      next: "Next month",
      selectedDay: "Selected date",
      eventCount: "events",
      event: "event",
      legend: "Scheduled activities",
      viewAll: "View full calendar",
      compactDescription: "Important dates, community activities and opportunities to participate in civic life.",
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    ha: {
      eyebrow: "Kasance cikin sani",
      title: "Kalandar Ayyukan Jama'a",
      description: "Duba ayyukan al'umma masu zuwa, tarukan jama'a, shirye-shiryen wayar da kai da muhimman ranakun al'umma.",
      loading: "Ana loda kalandar...",
      error: "Ba mu iya buɗe kalandar a yanzu ba. A sake gwadawa daga baya.",
      empty: "Babu wani aiki da aka tsara a wannan rana.",
      emptyHint: "Zaɓi wata rana ko duba ayyukan da ke tafe.",
      upcoming: "Ayyukan da ke tafe",
      noUpcoming: "Babu wasu ayyuka da ke tafe a yanzu.",
      today: "Yau",
      previous: "Watan da ya gabata",
      next: "Watan da ke gaba",
      selectedDay: "Ranar da aka zaɓa",
      eventCount: "ayyuka",
      event: "aiki",
      legend: "Ayyukan da aka tsara",
      viewAll: "Duba cikakkiyar kalanda",
      compactDescription: "Muhimman ranaku, ayyukan al'umma da damar shiga harkokin farar hula.",
      weekdays: ["Lit", "Tal", "Lar", "Alh", "Jum", "Asa", "Lah"],
    },
  }[language];

  const calendarDates = useMemo(
    () => getCalendarDates(displayedMonth),
    [displayedMonth]
  );

  const eventsByDate = useMemo(() => {
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
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => (event.end_date || event.start_date) >= today)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 3),
    [events, today]
  );

  const weekdays = text.weekdays;

  function changeMonth(amount: number) {
    setDisplayedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  function goToToday() {
    const current = dateFromKey(today);
    setSelectedDate(today);
    setDisplayedMonth(new Date(current.getFullYear(), current.getMonth(), 1));
  }

  if (compact) {
    const compactEvents = upcomingEvents;

    return (
      <section className="h-full">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-[0.15em] text-[#a84300] uppercase">
            {text.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl">
            {text.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#595959]">
            {text.compactDescription}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#e7e4e0] bg-white px-5 py-10 text-sm text-[#595959]">
            <LoaderCircle size={19} className="animate-spin text-[#a84300]" />
            {text.loading}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#e7e4e0] bg-white px-5 py-8 text-sm text-[#595959]">
            {text.error}
          </div>
        ) : compactEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d4ce] bg-white px-5 py-10 text-center">
            <CalendarDays size={30} className="mx-auto text-[#c4bcb4]" />
            <p className="mt-3 font-semibold text-[#333]">{text.noUpcoming}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {compactEvents.map((event) => (
              <EventCard key={event.id} event={event} language={language} />
            ))}
          </div>
        )}

        <Link
          href="/civic-calendar"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#a84300] transition hover:text-[#803300]"
        >
          {text.viewAll}
          <ArrowRight size={16} />
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-[0.15em] text-[#a84300] uppercase">
          {text.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#171717] sm:text-4xl">
          {text.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#595959] sm:text-base">
          {text.description}
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-[#e7e4e0] bg-white text-sm text-[#595959]">
          <LoaderCircle size={20} className="animate-spin text-[#a84300]" />
          {text.loading}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#e7e4e0] bg-white px-6 py-10 text-sm text-[#595959]">
          {text.error}
        </div>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
            <div className="overflow-hidden rounded-2xl border border-[#e7e4e0] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae6] px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#171717] sm:text-xl">
                    {formatMonth(displayedMonth, language)}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#777]">
                    {text.legend}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goToToday}
                    className="mr-1 rounded-lg border border-[#e7e4e0] px-3 py-2 text-xs font-semibold text-[#444] transition hover:border-[#c94f00] hover:text-[#a84300]"
                  >
                    {text.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label={text.previous}
                    className="flex size-9 items-center justify-center rounded-lg border border-[#e7e4e0] text-[#555] transition hover:border-[#c94f00] hover:bg-[#fff8f3] hover:text-[#a84300]"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label={text.next}
                    className="flex size-9 items-center justify-center rounded-lg border border-[#e7e4e0] text-[#555] transition hover:border-[#c94f00] hover:bg-[#fff8f3] hover:text-[#a84300]"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-[#eeeae6] bg-[#faf9f7]">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-[11px] font-semibold text-[#777] sm:text-xs"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDates.map((date) => {
                  const key = dateKey(date);
                  const inMonth = date.getMonth() === displayedMonth.getMonth();
                  const isToday = key === today;
                  const selected = key === selectedDate;
                  const dayEvents = eventsByDate.get(key) ?? [];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      aria-pressed={selected}
                      aria-label={`${formatDate(key, language)}${dayEvents.length ? `, ${dayEvents.length} ${text.eventCount}` : ""}`}
                      className={`relative flex min-h-[66px] flex-col items-center justify-start border-r border-b border-[#f0ede9] px-1 py-2 transition sm:min-h-[94px] sm:py-3 ${
                        inMonth ? "bg-white" : "bg-[#faf9f7]/70"
                      } ${
                        selected
                          ? "z-10 bg-[#fff3eb] ring-2 ring-inset ring-[#c94f00]"
                          : "hover:bg-[#fff8f3]"
                      }`}
                    >
                      <span
                        className={`flex size-7 items-center justify-center rounded-full text-xs font-medium sm:size-8 sm:text-sm ${
                          selected
                            ? "bg-[#c94f00] font-bold text-white"
                            : isToday
                              ? "border border-[#c94f00] font-bold text-[#a84300]"
                              : inMonth
                                ? "text-[#333]"
                                : "text-[#b8b3ad]"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <span className="mt-2 flex min-h-1.5 items-center justify-center gap-1">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <span
                            key={`${event.id}-${index}`}
                            className="size-1.5 rounded-full bg-[#ff6600]"
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] font-semibold text-[#a84300]">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="mt-1 hidden text-[10px] font-medium text-[#a84300] sm:block">
                          {dayEvents.length} {dayEvents.length === 1 ? text.event : text.eventCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-[11px] text-[#777] sm:px-6">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#ff6600]" />
                  {text.legend}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full border border-[#c94f00]" />
                  {text.today}
                </span>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#e7e4e0] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.12em] text-[#a84300] uppercase">
                    {text.selectedDay}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#171717]">
                    {formatDate(selectedDate, language)}
                  </h2>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e5] text-[#a84300]">
                  <CalendarDays size={20} />
                </span>
              </div>

              <div className="mt-5">
                {selectedEvents.length > 0 ? (
                  <div className="grid gap-3">
                    {selectedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        language={language}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#ded8d1] bg-[#faf9f7] px-4 py-8 text-center">
                    <CalendarDays size={26} className="mx-auto text-[#c4bcb4]" />
                    <p className="mt-3 text-sm font-semibold text-[#333]">
                      {text.empty}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#777]">
                      {text.emptyHint}
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#a84300] uppercase">
                  {text.eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#171717] sm:text-2xl">
                  {text.upcoming}
                </h2>
              </div>
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a84300] transition hover:text-[#803300]"
              >
                <ArrowLeft size={14} />
                {text.today}
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    language={language}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#ded8d1] bg-white px-5 py-8 text-center text-sm text-[#777]">
                {text.noUpcoming}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
