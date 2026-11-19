"use client";

import { useEffect, useRef } from "react";

/**
 * Staggered entrance for a list as it scrolls into view (CSS in globals.css:
 * `[data-reveal]`, children read `--i` for their delay).
 *
 * Content is visible by default. Only a list that is still below the fold
 * once the script runs is set to "pending", so nothing on screen ever
 * blinks out, and a failed script leaves everything visible.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "in";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
    };
  }, []);

  return ref;
}
