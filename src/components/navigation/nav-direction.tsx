"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  ViewTransition,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type NavDirection = "forward" | "back" | "lateral";

let clearTimer: number | undefined;
let lastViewTransitionAt = -Infinity;
let patchedStartViewTransition = false;

/** Record when React starts a view transition, so we know if one ran for a navigation. */
function trackViewTransitions() {
  if (patchedStartViewTransition || typeof document === "undefined") return;
  if (typeof document.startViewTransition !== "function") return;
  const original = document.startViewTransition.bind(document);
  patchedStartViewTransition = true;
  document.startViewTransition = ((
    ...args: Parameters<typeof document.startViewTransition>
  ) => {
    lastViewTransitionAt = performance.now();
    return original(...args);
  }) as typeof document.startViewTransition;
}

/**
 * Tag the next view transition with a direction. CSS in globals.css reads
 * `html[data-nav]` to slide pages forward / back or cross-fade laterally.
 */
export function setNavDirection(direction: NavDirection) {
  const root = document.documentElement;
  root.dataset.nav = direction;
  window.clearTimeout(clearTimer);
  // Safety net in case the navigation never commits (e.g. same URL).
  clearTimer = window.setTimeout(() => delete root.dataset.nav, 8000);
}

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

function isAncestor(ancestor: string, path: string) {
  if (ancestor === path) return false;
  if (ancestor === "/") return true;
  return path.startsWith(`${ancestor}/`);
}

/** Spatial model: drilling into a hierarchy is forward, popping out is back. */
export function directionBetween(from: string, to: string): NavDirection | null {
  if (from === to) return null;
  if (isAncestor(from, to)) return "forward";
  if (isAncestor(to, from)) return "back";
  const delta = depth(to) - depth(from);
  if (delta > 0) return "forward";
  if (delta < 0) return "back";
  return "lateral";
}

type NavigationLike = EventTarget & {
  currentEntry?: { index: number } | null;
};

type NavigateEventLike = Event & {
  navigationType?: string;
  destination?: { index: number };
};

/**
 * Listens for in-app navigations and sets the transition direction before
 * React commits the new route, including browser back/forward and the
 * Android/iOS back gesture (predictive back), which carry no transition type.
 */
export function NavDirectionListener() {
  const pathname = usePathname();

  // Clear the tag shortly after the route commits and the slide has played.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      delete document.documentElement.dataset.nav;
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    trackViewTransitions();

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const explicit = anchor.dataset.nav as NavDirection | undefined;
      const direction = explicit ?? directionBetween(window.location.pathname, url.pathname);
      if (direction) setNavDirection(direction);
    }

    // Capture phase so the tag is set before Next's Link handler starts the transition.
    document.addEventListener("click", onClick, true);

    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;

    function onNavigate(event: Event) {
      const navigateEvent = event as NavigateEventLike;
      if (navigateEvent.navigationType !== "traverse") return;
      const from = navigation?.currentEntry?.index ?? 0;
      const to = navigateEvent.destination?.index ?? 0;
      setNavDirection(to < from ? "back" : "forward");
    }

    function onPopState() {
      // Browsers without the Navigation API: most traversals are "back".
      if (!document.documentElement.dataset.nav) setNavDirection("back");
    }

    if (navigation) {
      navigation.addEventListener("navigate", onNavigate);
    } else {
      window.addEventListener("popstate", onPopState);
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}

/**
 * Keys page content by pathname so every route change is an exit/enter pair
 * for the View Transitions API. Layout chrome (header, footer) stays outside
 * and remains anchored while content slides.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  // Back/forward traversals (browser button, edge-swipe back gesture) are
  // applied by Next outside a React transition, so no view transition runs.
  // Keep the spatial cue anyway: the incoming page slides in from the side
  // it lives on in the history stack.
  useLayoutEffect(() => {
    const direction = document.documentElement.dataset.nav;
    const element = contentRef.current;
    if (!element || (direction !== "back" && direction !== "forward")) return;
    if (performance.now() - lastViewTransitionAt < 1000) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = direction === "back" ? "-48px" : "48px";

    element.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, translate: `${offset} 0` },
            { opacity: 1, translate: "0 0" },
          ],
      { duration: reduced ? 160 : 380, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }
    );
  }, [pathname]);

  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      <div ref={contentRef}>{children}</div>
    </ViewTransition>
  );
}
