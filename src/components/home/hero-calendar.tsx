"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "motion/react";
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
  formatDateRange,
  formatShortMonth,
  formatTime,
  upcomingFrom,
  useCivicEvents,
  type CivicEvent,
} from "@/lib/civic-events";

/** How long each event stays up while the slideshow plays. */
const SLIDE_MS = 4500;
const MAX_EVENTS = 12;
/** A swipe this far (px) or this fast (px/s) moves to the neighbouring event. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

/** Events slide the way time moves: later events come in from the right. */
const slideVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: springs.move },
  exit: (direction: number) => ({ x: direction * -56, opacity: 0, transition: springs.exit }),
};

// Today's date as a store: empty on the server (no locale/timezone guess),
// the browser's date after hydration, re-checked each minute past midnight.
const subscribeToday = (callback: () => void) => {
  const id = window.setInterval(callback, 60_000);
  return () => window.clearInterval(id);
};
const getToday = () => dateKey(new Date());
const getServerToday = () => "";

/** The day to show for an event: its start, or today if it's already running. */
function focusDateOf(event: CivicEvent, today: string) {
  return event.start_date < today ? today : event.start_date;
}

/**
 * The home hero's Civic Calendar: one upcoming event at a time, sliding on
 * to the next. Arrows, swipe and the keyboard move it; hover, focus, an open
 * menu or a reduced-motion preference hold it still.
 */
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
  const [dragging, setDragging] = useState(false);
  // Menus render in a portal outside this card, so hover/focus can't see them.
  const [menuOpen, setMenuOpen] = useState(false);
  // A swipe ends with a click on the link underneath; this swallows it.
  const swipedRef = useRef(false);

  useEffect(() => {
    const onMenu = (event: Event) => setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(MENU_EVENT, onMenu);
    return () => window.removeEventListener(MENU_EVENT, onMenu);
  }, []);

  const upcoming = useMemo(
    () => (today ? upcomingFrom(events, today, MAX_EVENTS) : []),
    [events, today]
  );

  const count = upcoming.length;
  const active = count ? index % count : 0;
  const event: CivicEvent | undefined = upcoming[active];
  const focusKey = event ? focusDateOf(event, today) : today;

  const playing = (playChoice ?? !reduceMotion) && count > 1;
  const paused = !playing || hovered || focused || menuOpen || dragging;

  function goTo(target: number) {
    if (!count) return;
    const next = ((target % count) + count) % count;
    if (next === active) return;
    const toKey = focusDateOf(upcoming[next], today);
    setDirection(toKey >= focusKey ? 1 : -1);
    setIndex(next);
  }

  function onSwipeEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) goTo(active + 1);
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) goTo(active - 1);
  }

  const shell =
    "relative w-full overflow-hidden rounded-[28px] bg-paper-raised text-ink shadow-[0_40px_80px_-32px_rgb(4_9_20/0.7)] ring-1 ring-ink/5";

  // Before hydration we don't know today's date: hold the space quietly.
  if (!today) {
    return (
      <div className={`${shell} h-[300px]`} aria-hidden="true">
        <div className="absolute inset-6 animate-pulse rounded-2xl bg-tint motion-reduce:animate-none" />
      </div>
    );
  }

  const title = event ? (language === "ha" ? event.title_ha : event.title_en) : "";
  const venue = event ? (language === "ha" ? event.venue_ha : event.venue_en) : null;
  const category = event ? (categoryLabels[event.category] ?? categoryLabels.other)[language] : "";
  const spansDays = Boolean(event?.end_date && event.end_date !== event.start_date);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-labelledby="hero-calendar-title"
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
      <div className="flex items-center justify-between gap-3 px-6 pt-5 sm:px-7 sm:pt-6">
        <h2 id="hero-calendar-title" className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">
          {t("heroCalendarTitle")}
        </h2>

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

      <div
        className="relative mt-4 min-h-[132px] overflow-hidden px-6 sm:px-7"
        aria-live={playing && !paused ? "off" : "polite"}
        aria-busy={loading}
      >
        {loading ? (
          <div role="status" aria-label={t("heroCalendarLoading")} className="flex items-start gap-5 py-1">
            <div className="size-[76px] shrink-0 animate-pulse rounded-2xl bg-line-soft motion-reduce:animate-none" />
            <div className="flex-1 space-y-2.5 pt-1">
              <div className="h-3.5 w-24 animate-pulse rounded-full bg-line-soft motion-reduce:animate-none" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-tint motion-reduce:animate-none" />
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[120px] items-center justify-between gap-4">
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
          <div className="flex min-h-[120px] items-center gap-5">
            <span className="flex size-[76px] shrink-0 items-center justify-center rounded-2xl bg-tint text-ink-subtle">
              <CalendarDays size={28} aria-hidden="true" />
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
              drag={count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              dragSnapToOrigin
              onDragStart={() => {
                swipedRef.current = true;
                setDragging(true);
              }}
              onDragEnd={onSwipeEnd}
              className="touch-pan-y"
            >
              <Link
                href={`/civic-calendar?date=${focusKey}`}
                draggable={false}
                onClickCapture={(e) => {
                  if (swipedRef.current) {
                    e.preventDefault();
                    swipedRef.current = false;
                  }
                }}
                onPointerDown={() => {
                  swipedRef.current = false;
                }}
                className="group -mx-2 flex items-start gap-5 rounded-2xl p-2 transition-colors hover:bg-ink/[0.035] focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span className="flex size-[76px] shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
                  <span className="text-xs font-bold tracking-wide text-signal uppercase">
                    {formatShortMonth(focusKey, language)}
                  </span>
                  <span className="font-heading text-3xl leading-8 font-extrabold tabular-nums">
                    {dateFromKey(focusKey).getDate()}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-subtle">{category}</span>
                  <span className="mt-1 line-clamp-2 block font-heading text-lg leading-snug font-bold sm:text-xl">
                    {title}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                    {spansDays && event.end_date ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} aria-hidden="true" />
                        {formatDateRange(event.start_date, event.end_date, language)}
                      </span>
                    ) : event.start_time ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} aria-hidden="true" />
                        {formatTime(event.start_time, language)}
                      </span>
                    ) : null}
                    {venue ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin size={14} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{venue}</span>
                      </span>
                    ) : null}
                  </span>
                </span>

                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink transition group-hover:border-signal group-hover:bg-signal"
                  aria-hidden="true"
                >
                  <ArrowUpRight size={18} />
                </span>
                <span className="sr-only">{t("heroCalendarOpen")}</span>
              </Link>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-between px-6 pt-3 pb-6 text-sm sm:px-7">
        <Link
          href="/civic-calendar"
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-ink underline-offset-4 hover:underline"
        >
          {t("heroCalendarViewAll")}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        {count > 1 ? (
          <span className="tabular-nums text-ink-subtle">
            {active + 1} {t("heroCalendarOf")} {count}
          </span>
        ) : null}
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
