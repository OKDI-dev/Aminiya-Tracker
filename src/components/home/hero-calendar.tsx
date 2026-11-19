"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { MENU_EVENT } from "@/components/report-menu";
import { springs } from "@/lib/motion";
import {
  categoryLabels,
  dateFromKey,
  dateKey,
  formatLongDate,
  formatMonth,
  formatShortMonth,
  formatTime,
  groupEventsByDate,
  upcomingFrom,
  useCivicEvents,
  type CivicEvent,
} from "@/lib/civic-events";

/** How long each event stays up while the slideshow plays. */
const SLIDE_MS = 4500;
/** Enough to usually carry the slideshow past the current month. */
const MAX_EVENTS = 12;

const weekdays = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ha: ["Lit", "Tal", "Lar", "Alh", "Jum", "Asa", "Lah"],
};

/** Grid and ticket slide the way time moves: later dates come from the right. */
const slideVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: springs.move },
  exit: (direction: number) => ({ x: direction * -40, opacity: 0, transition: springs.exit }),
};

// Today's date as a store: empty on the server (no locale/timezone guess),
// the browser's date after hydration, re-checked each minute past midnight.
const subscribeToday = (callback: () => void) => {
  const id = window.setInterval(callback, 60_000);
  return () => window.clearInterval(id);
};
const getToday = () => dateKey(new Date());
const getServerToday = () => "";

/** Always six weeks, so the card keeps one height as months change. */
function sixWeekGrid(month: Date) {
  const offset = (month.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1)
  );
}

/** The day to show for an event: its start, or today if it's already running. */
function focusDateOf(event: CivicEvent, today: string) {
  return event.start_date < today ? today : event.start_date;
}

function monthOf(key: string) {
  const date = dateFromKey(key);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function HeroCalendar() {
  const { language, t } = useLanguage();
  const { events, loading, error, retrying, retry } = useCivicEvents();
  const today = useSyncExternalStore(subscribeToday, getToday, getServerToday);
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // null = follow the default: play, unless the OS asks for reduced motion.
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Menus render in a portal outside this card, so hover/focus can't see them.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onMenu = (event: Event) => setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(MENU_EVENT, onMenu);
    return () => window.removeEventListener(MENU_EVENT, onMenu);
  }, []);

  const upcoming = useMemo(
    () => (today ? upcomingFrom(events, today, MAX_EVENTS) : []),
    [events, today]
  );
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  // Days you can tap to jump to: each maps to its first upcoming event.
  const indexByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, list] of groupEventsByDate(upcoming)) {
      if (key >= today) map.set(key, upcoming.indexOf(list[0]));
    }
    return map;
  }, [upcoming, today]);

  const count = upcoming.length;
  const active = count ? index % count : 0;
  const event: CivicEvent | undefined = upcoming[active];
  const focusKey = event ? focusDateOf(event, today) : today;
  const month = focusKey ? monthOf(focusKey) : null;
  const monthKey = month ? `${month.getFullYear()}-${month.getMonth()}` : "pending";

  const playing = (playChoice ?? !reduceMotion) && count > 1;
  const paused = !playing || hovered || focused || menuOpen;

  // Days the current event spans, drawn as a soft band behind the dates.
  const activeSpan = useMemo(() => {
    if (!event) return new Set<string>();
    return new Set(
      [...groupEventsByDate([event]).keys()].filter((key) => key >= today)
    );
  }, [event, today]);

  function goTo(target: number) {
    if (!count) return;
    const next = ((target % count) + count) % count;
    if (next === active) return;
    const fromKey = focusKey;
    const toKey = focusDateOf(upcoming[next], today);
    setDirection(toKey >= fromKey ? 1 : -1);
    setIndex(next);
  }

  const shell =
    "relative w-full overflow-hidden rounded-[28px] bg-paper-raised text-ink shadow-[0_40px_80px_-32px_rgb(4_9_20/0.7)] ring-1 ring-ink/5";

  // Before hydration we don't know today's date: hold the space quietly.
  if (!month) {
    return (
      <div className={`${shell} h-[500px] sm:h-[540px]`} aria-hidden="true">
        <div className="absolute inset-5 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
      </div>
    );
  }

  const title = event ? (language === "ha" ? event.title_ha : event.title_en) : "";
  const venue = event ? (language === "ha" ? event.venue_ha : event.venue_en) : null;
  const category = event
    ? (categoryLabels[event.category] ?? categoryLabels.other)[language]
    : "";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("heroCalendarLabel")}
      className={shell}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") goTo(active + 1);
        else if (e.key === "ArrowLeft") goTo(active - 1);
      }}
    >
      {/* Header: month and controls */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          <h2 className="relative overflow-hidden font-heading text-xl font-extrabold tracking-tight sm:text-2xl">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.span
                key={monthKey}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="block"
              >
                {formatMonth(month, language)}
              </motion.span>
            </AnimatePresence>
          </h2>
        </div>

        {count > 1 ? (
          <div className="-mr-2 flex shrink-0 items-center">
            <ControlButton label={t("heroCalendarPrevious")} onClick={() => goTo(active - 1)}>
              <ChevronLeft size={17} />
            </ControlButton>
            <ControlButton
              label={playing ? t("heroCalendarPause") : t("heroCalendarPlay")}
              onClick={() => setPlayChoice(!playing)}
            >
              {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
            </ControlButton>
            <ControlButton label={t("heroCalendarNext")} onClick={() => goTo(active + 1)}>
              <ChevronRight size={17} />
            </ControlButton>
          </div>
        ) : null}
      </div>

      {/* Month grid */}
      <div className="px-3 pt-4 sm:px-4">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-subtle">
          {weekdays[language].map((day) => (
            <span key={day} className="py-1.5">
              {day}
            </span>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={monthKey}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-7"
            >
              <LayoutGroup id={`hero-month-${monthKey}`}>
                {sixWeekGrid(month).map((date, cell) => {
                  const key = dateKey(date);
                  const inMonth = date.getMonth() === month.getMonth();
                  const isFocus = event !== undefined && key === focusKey;
                  // A band only reads as a range when there's more than one day.
                  const inSpan = activeSpan.size > 1 && activeSpan.has(key) && inMonth;
                  // Round the band where the span (or the week row) starts and ends.
                  const column = cell % 7;
                  const prevKey = dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
                  const nextKey = dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
                  const capStart = inSpan && (column === 0 || !activeSpan.has(prevKey));
                  const capEnd = inSpan && (column === 6 || !activeSpan.has(nextKey));
                  const jumpTo = indexByDate.get(key);
                  // Only days you can tap look tappable; past events stay quiet.
                  const tappable = jumpTo !== undefined && inMonth;
                  const hadEvents = !tappable && inMonth && (eventsByDate.get(key)?.length ?? 0) > 0;
                  const isToday = key === today;

                  const label = (
                    <>
                      {isFocus ? (
                        <motion.span
                          layoutId="hero-focus-day"
                          transition={springs.move}
                          className="absolute inset-0.5 rounded-full bg-signal"
                          aria-hidden="true"
                        />
                      ) : null}
                      {/* Days from the neighbouring months stay as empty cells: they keep
                          the grid's shape without competing with this month. */}
                      {inMonth ? <span className="relative">{date.getDate()}</span> : null}
                      {(tappable || hadEvents) && !isFocus ? (
                        <span
                          aria-hidden="true"
                          style={{ "--i": cell } as CSSProperties}
                          className={`dot-pop absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                            tappable ? "bg-signal" : "bg-ink/25"
                          }`}
                        />
                      ) : null}
                    </>
                  );

                  // 44px tall hit area on every day; the width is the column (~44px on phones).
                  const dayClass = `relative flex h-11 w-full max-w-11 items-center justify-center rounded-full text-sm tabular-nums ${
                    isFocus
                      ? "font-extrabold text-ink"
                      : !inMonth
                        ? "text-ink/30"
                        : tappable
                          ? "font-bold text-ink"
                          : "text-ink-muted"
                  } ${isToday && !isFocus ? "ring-1 ring-ink-subtle ring-inset" : ""}`;

                  return (
                    <div
                      key={key}
                      className={`flex justify-center ${
                        inSpan ? "bg-tint" : ""
                      } ${capStart ? "rounded-l-full" : ""} ${capEnd ? "rounded-r-full" : ""}`}
                    >
                      {tappable ? (
                        <button
                          type="button"
                          onClick={() => goTo(jumpTo)}
                          aria-label={`${formatLongDate(date, language)}: ${language === "ha" ? upcoming[jumpTo].title_ha : upcoming[jumpTo].title_en}`}
                          aria-current={isFocus ? "date" : undefined}
                          className={`${dayClass} transition-colors hover:bg-ink/[0.05] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ink`}
                        >
                          {label}
                        </button>
                      ) : (
                        <span className={dayClass} aria-hidden="true">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </LayoutGroup>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Event ticket */}
      <div className="mt-3 border-t border-ink/[0.06] px-5 pt-4 pb-6 sm:px-6">
        <div
          className="relative min-h-[92px] overflow-hidden"
          aria-live={playing && !paused ? "off" : "polite"}
          aria-busy={loading}
        >
          {loading ? (
            <div role="status" aria-label={t("heroCalendarLoading")} className="flex items-center gap-4">
              <div className="size-[60px] shrink-0 animate-pulse rounded-2xl bg-line-soft motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 animate-pulse rounded-full bg-line-soft motion-reduce:animate-none" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-tint motion-reduce:animate-none" />
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[92px] items-center justify-between gap-4">
              <p className="text-sm leading-6 text-ink-muted">
                {t("heroCalendarError")} {t("heroCalendarErrorHint")}
              </p>
              <button
                type="button"
                onClick={retry}
                disabled={retrying}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-raised disabled:opacity-70"
              >
                {retrying ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={15} aria-hidden="true" />
                )}
                {t("heroCalendarRetry")}
              </button>
            </div>
          ) : !event ? (
            <div className="flex min-h-[92px] items-center gap-4">
              <span className="flex size-[60px] shrink-0 items-center justify-center rounded-2xl bg-tint text-ink-subtle">
                <CalendarDays size={24} aria-hidden="true" />
              </span>
              <p className="text-sm leading-6 text-ink-muted">{t("heroCalendarEmpty")}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={event.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                aria-roledescription="slide"
                aria-label={`${active + 1} ${t("heroCalendarOf")} ${count}`}
              >
                <Link
                  href={`/civic-calendar?date=${focusKey}`}
                  className="group -m-2 flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-ink/[0.035] focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <span className="flex size-[60px] shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
                    <span className="text-xs font-bold tracking-wide text-signal uppercase">
                      {formatShortMonth(focusKey, language)}
                    </span>
                    <span className="font-heading text-2xl leading-7 font-extrabold tabular-nums">
                      {dateFromKey(focusKey).getDate()}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink-subtle">
                      {category}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block font-heading text-[15px] leading-snug font-bold sm:text-base">
                      {title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                      {event.start_time ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} aria-hidden="true" />
                          {formatTime(event.start_time, language)}
                        </span>
                      ) : null}
                      {venue ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin size={12} aria-hidden="true" className="shrink-0" />
                          <span className="truncate">{venue}</span>
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink transition group-hover:border-signal group-hover:bg-signal"
                    aria-hidden="true"
                  >
                    <ArrowUpRight size={17} />
                  </span>
                  <span className="sr-only">{t("heroCalendarOpen")}</span>
                </Link>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <Link
            href="/civic-calendar"
            className="inline-flex items-center gap-1 font-semibold text-ink underline-offset-4 hover:underline"
          >
            {t("heroCalendarViewAll")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          {count > 1 ? (
            <span className="tabular-nums text-ink-subtle">
              {active + 1} {t("heroCalendarOf")} {count}
            </span>
          ) : null}
        </div>
      </div>

      {/* The progress bar is the timer: when it fills, the next event slides in. */}
      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/[0.06]" aria-hidden="true">
          {playing ? (
            <span
              key={event?.id}
              data-paused={paused}
              onAnimationEnd={() => goTo(active + 1)}
              style={{ "--hero-slide-ms": `${SLIDE_MS}ms` } as CSSProperties}
              className="hero-calendar-progress block h-full bg-signal"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={springs.snappy}
      className="group/control flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ink"
    >
      {/* 44px hit area around a 36px visible ring. */}
      <span className="flex size-9 items-center justify-center rounded-full border border-ink/15 text-ink-muted transition-colors group-hover/control:border-ink group-hover/control:text-ink">
        {children}
      </span>
    </motion.button>
  );
}
