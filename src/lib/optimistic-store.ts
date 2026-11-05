"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny cross-component store for optimistic UI on server-rendered admin tables.
 *
 * A row's badge (server component markup) and its action buttons (client
 * component) live in different cells; this store lets the action write an
 * optimistic value that the badge renders immediately, until the refreshed
 * server props catch up or the request fails and the value is rolled back.
 */
type Listener = () => void;

const statusOverrides = new Map<string, string>();
const hiddenRows = new Set<string>();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const optimisticStore = {
  setStatus(key: string, status: string) {
    statusOverrides.set(key, status);
    emit();
  },
  clearStatus(key: string) {
    if (statusOverrides.delete(key)) emit();
  },
  hideRow(key: string) {
    hiddenRows.add(key);
    emit();
  },
  showRow(key: string) {
    if (hiddenRows.delete(key)) emit();
  },
};

/** Returns the optimistic status if one is pending, else the server value. */
export function useOptimisticStatus(key: string, serverStatus: string) {
  const override = useSyncExternalStore(
    subscribe,
    () => statusOverrides.get(key),
    () => undefined
  );
  return override ?? serverStatus;
}

export function useRowHidden(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => hiddenRows.has(key),
    () => false
  );
}
