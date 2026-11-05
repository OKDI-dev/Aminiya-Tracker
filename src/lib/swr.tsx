"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import useSWR, { SWRConfig, type Cache, type SWRConfiguration } from "swr";

const STORAGE_KEY = "aminiya-swr-v1";
const PERSISTED_PREFIXES = ["/api/public/", "/api/community-issues", "public:"];
const MAX_PERSISTED_BYTES = 1_500_000;

export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new FetchError(
      body?.error || `Request failed with status ${response.status}`,
      response.status
    );
  }
  return response.json() as Promise<T>;
}

/**
 * Persist public, non-personal responses across visits so returning users
 * see the last known data instantly while SWR revalidates in the background.
 */
function persistentProvider(): Cache {
  const map = new Map<string, unknown>();

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      for (const [key, data] of JSON.parse(stored) as [string, unknown][]) {
        map.set(key, { data });
      }
    }
  } catch {
    // Storage unavailable (private mode, blocked): fall back to memory only.
  }

  const save = () => {
    try {
      const entries: [string, unknown][] = [];
      for (const [key, state] of map) {
        const data = (state as { data?: unknown } | undefined)?.data;
        if (
          data !== undefined &&
          PERSISTED_PREFIXES.some((prefix) => key.startsWith(prefix))
        ) {
          entries.push([key, data]);
        }
      }
      const serialized = JSON.stringify(entries);
      if (serialized.length <= MAX_PERSISTED_BYTES) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch {
      // Quota or serialization failure: persistence is best-effort.
    }
  };

  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });

  return map as Cache;
}

const config: SWRConfiguration = {
  fetcher: jsonFetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  dedupingInterval: 4000,
  errorRetryCount: 2,
};

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        ...config,
        provider: typeof window === "undefined" ? undefined : persistentProvider,
      }}
    >
      {children}
    </SWRConfig>
  );
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Stale-while-revalidate for public data.
 * The key is withheld until hydration so server and client markup match;
 * on the next frame the cached value (if any) renders immediately and a
 * background revalidation refreshes it.
 */
export function usePublicData<T>(
  key: string | null,
  fetcher?: () => Promise<T>,
  options?: SWRConfiguration<T>
) {
  const hydrated = useHydrated();
  const result = useSWR<T>(
    hydrated ? key : null,
    fetcher ? () => fetcher() : (url: string) => jsonFetcher<T>(url),
    options
  );

  return {
    ...result,
    /** True only when there's nothing to show yet (no cached data). */
    isFirstLoad: !hydrated || (result.data === undefined && !result.error),
    /** Background refresh while stale data is on screen. */
    isRevalidating: result.isValidating && result.data !== undefined,
  };
}
