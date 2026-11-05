"use client";

import { useEffect, useRef } from "react";

type CloseWatcherLike = {
  onclose: (() => void) | null;
  oncancel: ((event: Event) => void) | null;
  destroy: () => void;
};

type CloseWatcherCtor = new () => CloseWatcherLike;

/**
 * Predictive back for overlays.
 *
 * Registers a CloseWatcher while `active`, so the Android back gesture
 * (and Esc) dismisses the top-most sheet/dialog instead of navigating
 * away from the page. Watchers stack, so nested overlays close in order.
 * Browsers without CloseWatcher fall back to the component's own Esc handling.
 */
export function useCloseWatcher(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const Ctor = (window as unknown as { CloseWatcher?: CloseWatcherCtor })
      .CloseWatcher;
    if (!Ctor) return;

    let watcher: CloseWatcherLike | null = null;

    try {
      watcher = new Ctor();
      watcher.onclose = () => onCloseRef.current();
    } catch {
      // CloseWatcher requires user activation in some browsers; Esc still works.
      return;
    }

    return () => watcher?.destroy();
  }, [active]);
}
