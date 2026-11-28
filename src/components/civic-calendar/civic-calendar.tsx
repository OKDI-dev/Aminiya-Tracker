"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, type Variants } from "motion/react";
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
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import PublicPageHero from "@/components/public-page-hero";
import { prefersReducedMotion, springs } from "@/lib/motion";
import {
  categoryLabels,
  dateFromKey,
  dateKey,
  formatDate,
  formatMonth,
  formatTime,
  getCalendarDates,
  groupEventsByDate,
  upcomingFrom,
  useCivicEvents,
  type CivicEvent,
} from "@/lib/civic-events";

/** Month grid slides in the direction of navigation. */
const monthVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: springs.move },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0, transition: springs.exit }),
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line-soft bg-paper-raised p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-start gap-3.5">
        <div className="size-[58px] shrink-0 animate-pulse rounded-xl bg-line-soft motion-reduce:animate-none" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-24 animate-pulse rounded-full bg-line-soft motion-reduce:animate-none" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-tint motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function LoadError({
  message,
  retryLabel,
  retrying,
  onRetry,
  className = "",
}: {
  message: string;
  retryLabel: string;
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.default}
      className={`flex flex-col items-center gap-3 rounded-2xl border border-line-soft bg-paper-raised px-6 py-10 text-center text-sm text-ink-muted ${className}`}
    >
      <WifiOff size={26} className="text-ink-subtle" aria-hidden="true" />
      <p className="max-w-sm">{message}</p>
      <motion.button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        whileTap={{ scale: 0.96 }}
        transition={springs.snappy}
        className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-signal-hover disabled:opacity-70"
      >
        {retrying ? (
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={15} aria-hidden="true" />
        )}
        {retryLabel}
      </motion.button>
    </motion.div>
  );
}

function EventCard({
  event,
  language,
  index = 0,
  linkLabel,
}: {
  event: CivicEvent;
  language: "en" | "ha";
  /** Position in its list, for a short stagger on entry. */
  index?: number;
  /**
   * Set when the whole card sits inside a link: the nested registration
   * link is dropped (links can't nest) and this call to action shows instead.
   */
  linkLabel?: string;
}) {
  const title = language === "ha" ? event.title_ha : event.title_en;
  const description =
    language === "ha" ? event.description_ha : event.description_en;
  const venue = language === "ha" ? event.venue_ha : event.venue_en;
  const category =
    categoryLabels[event.category]?.[language] ?? categoryLabels.other[language];

  const eventDate = dateFromKey(event.start_date);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.default, delay: Math.min(index, 6) * 0.05 }}
      whileHover={{ y: -2 }}
      className={`group rounded-2xl border border-line-soft bg-paper-raised p-4 transition-[border-color,box-shadow] duration-200 hover:border-signal/50 hover:shadow-md sm:p-5 ${
        linkLabel ? "flex h-full flex-col" : ""
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex size-[58px] shrink-0 flex-col items-center justify-center rounded-xl bg-tint text-ink">
          <span className="text-xs font-bold uppercase">
            {new Intl.DateTimeFormat(language === "ha" ? "ha-NG" : "en-NG", {
              month: "short",
            }).format(eventDate)}
          </span>
          <span className="text-xl font-bold leading-6">
            {eventDate.getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-ink">
            {category}
          </span>

          <h3 className="mt-2 leading-6 text-ink font-heading text-lg font-bold">
            {title}
          </h3>

          {description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-muted">
              {description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
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

          {!linkLabel && event.registration_url && (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition underline-offset-4 hover:underline"
            >
              {language === "ha" ? "Ƙarin bayani / Rajista" : "Details / Registration"}
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {linkLabel ? (
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-ink">
          {linkLabel}
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      ) : null}
    </motion.article>
  );
}

/** A `?date=YYYY-MM-DD` deep link, if present and a real date. */
function readDateParam(): string | null {
  try {
    const value = new URLSearchParams(window.location.search).get("date");
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return dateKey(dateFromKey(value)) === value ? value : null;
  } catch {
    return null;
  }
}

export default function CivicCalendar() {
  const { language } = useLanguage();
  const { events, loading, error, retrying, retry: retryLoad } = useCivicEvents();
  const [monthDirection, setMonthDirection] = useState(1);

  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("2000-01-01");
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(2000, 0, 1)
  );

  // Set when the page was opened on a specific day (e.g. from the home page).
  const deepLinkedRef = useRef(false);
  const dayPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const currentDate = new Date();
    const currentKey = dateKey(currentDate);
    const linked = readDateParam();
    const focusDate = linked ? dateFromKey(linked) : currentDate;
    deepLinkedRef.current = Boolean(linked);

    // Initialize the calendar from the browser date (or ?date=) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(currentKey);
    setSelectedDate(linked ?? currentKey);
    setDisplayedMonth(
      new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    );
  }, []);

  // Once a deep-linked day has rendered, bring its events into view. On wide
  // screens the day panel sits beside the grid; on phones it is below it.
  useEffect(() => {
    if (loading || !deepLinkedRef.current) return;
    deepLinkedRef.current = false;
    const panel = dayPanelRef.current;
    if (!panel) return;
    requestAnimationFrame(() => {
      panel.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: window.matchMedia("(min-width: 1024px)").matches ? "nearest" : "start",
      });
    });
  }, [loading]);

  const text = {
    en: {
      title: "Civic Calendar",
      description: "Explore upcoming civic activities, public engagements, educational programmes and important community dates.",
      loading: "Loading civic calendar...",
      error: "We couldn't load the calendar. Check your connection and try again.",
      retry: "Try again",
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
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    ha: {
      title: "Kalandar Ayyukan Jama'a",
      description: "Duba ayyukan al'umma masu zuwa, tarukan jama'a, shirye-shiryen wayar da kai da muhimman ranakun al'umma.",
      loading: "Ana loda kalandar...",
      error: "Ba mu iya buɗe kalandar ba. Duba haɗin intanet ɗinka sannan ka sake gwadawa.",
      retry: "Sake gwadawa",
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
      weekdays: ["Lit", "Tal", "Lar", "Alh", "Jum", "Asa", "Lah"],
    },
  }[language];

  const calendarDates = useMemo(
    () => getCalendarDates(displayedMonth),
    [displayedMonth]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const upcomingEvents = useMemo(() => upcomingFrom(events, today, 3), [events, today]);


  const weekdays = text.weekdays;

  function changeMonth(amount: number) {
    setMonthDirection(amount > 0 ? 1 : -1);
    setDisplayedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  function goToToday() {
    const current = dateFromKey(today);
    const target = new Date(current.getFullYear(), current.getMonth(), 1);
    setMonthDirection(target < displayedMonth ? -1 : 1);
    setSelectedDate(today);
    setDisplayedMonth(target);
  }

  const monthKey = `${displayedMonth.getFullYear()}-${displayedMonth.getMonth()}`;

  return (
    <>
    <PublicPageHero title={text.title} description={text.description} />
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">

      {loading ? (
        <div
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]"
          role="status"
          aria-label={text.loading}
        >
          <div className="min-h-[420px] animate-pulse rounded-2xl border border-line-soft bg-paper-raised motion-reduce:animate-none" />
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : error ? (
        <LoadError
          message={text.error}
          retryLabel={text.retry}
          retrying={retrying}
          onRetry={retryLoad}
          className="min-h-64 justify-center"
        />
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
            <div className="overflow-hidden rounded-2xl border border-line-soft bg-paper-raised shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-4 sm:px-6">
                <div>
                  <h2 className="relative overflow-hidden text-ink font-heading text-xl font-bold tracking-tight" aria-live="polite">
                    <AnimatePresence mode="popLayout" initial={false} custom={monthDirection}>
                      <motion.span
                        key={monthKey}
                        custom={monthDirection}
                        variants={monthVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="block"
                      >
                        {formatMonth(displayedMonth, language)}
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {text.legend}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goToToday}
                    className="mr-1 rounded-lg border border-line-soft px-3 py-2 text-xs font-semibold text-ink-muted transition hover:border-signal hover:text-ink"
                  >
                    {text.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label={text.previous}
                    className="flex size-9 items-center justify-center rounded-lg border border-line-soft text-ink-muted transition hover:border-signal hover:bg-tint/60 hover:text-ink"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label={text.next}
                    className="flex size-9 items-center justify-center rounded-lg border border-line-soft text-ink-muted transition hover:border-signal hover:bg-tint/60 hover:text-ink"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-line-soft bg-paper">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-xs font-semibold text-ink-subtle"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={monthDirection}>
              <motion.div
                key={monthKey}
                custom={monthDirection}
                variants={monthVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="grid grid-cols-7"
              >
              <LayoutGroup id={`calendar-${monthKey}`}>
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
                      className={`relative flex min-h-[66px] flex-col items-center justify-start border-r border-b border-line-soft px-1 py-2 transition sm:min-h-[94px] sm:py-3 ${
                        inMonth ? "bg-paper-raised" : "bg-paper/70"
                      } ${
                        selected
                          ? "z-10 bg-tint ring-2 ring-inset ring-signal"
                          : "hover:bg-tint/60"
                      }`}
                    >
                      <span
                        className={`relative flex size-7 items-center justify-center rounded-full text-xs font-medium sm:size-8 sm:text-sm ${
                          selected
                            ? "font-bold text-ink"
                            : isToday
                              ? "border border-signal font-bold text-ink"
                              : inMonth
                                ? "text-ink-muted"
                                : "text-ink-subtle"
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="selected-day"
                            transition={springs.snappy}
                            className="absolute inset-0 rounded-full bg-signal"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative">{date.getDate()}</span>
                      </span>

                      <span className="mt-2 flex min-h-1.5 items-center justify-center gap-1">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <span
                            key={`${event.id}-${index}`}
                            className="size-1.5 rounded-full bg-signal"
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs leading-none font-semibold text-ink">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </span>

                    </button>
                  );
                })}
              </LayoutGroup>
              </motion.div>
              </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-ink-subtle sm:px-6">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-signal" />
                  {text.legend}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full border border-signal" />
                  {text.today}
                </span>
              </div>
            </div>

            <aside
              ref={dayPanelRef}
              className="scroll-mt-24 rounded-2xl border border-line-soft bg-paper-raised p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold text-ink" aria-live="polite">
                    <span className="sr-only">{text.selectedDay}: </span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={selectedDate}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6, transition: springs.exit }}
                        transition={springs.snappy}
                        className="block"
                      >
                        {formatDate(selectedDate, language)}
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
                  <CalendarDays size={20} />
                </span>
              </div>

              <div className="mt-5">
                {selectedEvents.length > 0 ? (
                  // Keyed by date so each new selection staggers its cards in.
                  <div key={selectedDate} className="grid gap-3">
                    {selectedEvents.map((event, index) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        language={language}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    key={`empty-${selectedDate}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springs.default}
                    className="rounded-xl border border-dashed border-line bg-paper px-4 py-8 text-center"
                  >
                    <CalendarDays size={26} className="mx-auto text-ink-subtle" />
                    <p className="mt-3 text-sm font-semibold text-ink-muted">
                      {text.empty}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-subtle">
                      {text.emptyHint}
                    </p>
                  </motion.div>
                )}
              </div>
            </aside>
          </div>

          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="font-heading text-xl font-bold text-ink sm:text-2xl">
                {text.upcoming}
              </h2>
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition underline-offset-4 hover:underline"
              >
                <ArrowLeft size={14} />
                {text.today}
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {upcomingEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    language={language}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-paper-raised px-5 py-8 text-center text-sm text-ink-subtle">
                {text.noUpcoming}
              </div>
            )}
          </section>
        </>
      )}
    </section>
    </>
  );
}
