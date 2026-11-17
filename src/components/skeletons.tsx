import { ViewTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A single shimmering block. Shapes mirror the real content to avoid layout shift. */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton-shimmer rounded-md", className)} />;
}

/** Announces loading once to assistive tech, hides the decorative bones. */
function LoadingRegion({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function CardSkeleton({ media = false, lines = 3 }: { media?: boolean; lines?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {media ? <Bone className="h-44 rounded-none" /> : null}
      <div className="space-y-3 p-5">
        {!media ? (
          <div className="flex items-center justify-between">
            <Bone className="h-6 w-24 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
        ) : null}
        <Bone className="h-5 w-3/4" />
        {Array.from({ length: lines }).map((_, index) => (
          <Bone key={index} className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  media = false,
  className = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
  label = "Loading…",
}: {
  count?: number;
  media?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} media={media} />
      ))}
    </LoadingRegion>
  );
}

export function ListSkeleton({ rows = 4, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <LoadingRegion label={label} className="grid gap-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <Bone className="h-6 w-28 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
          <Bone className="mt-4 h-3.5 w-full" />
          <Bone className="mt-2 h-3.5 w-4/5" />
          <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
            <Bone className="h-3 w-3/4" />
            <Bone className="h-3 w-2/3" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, label = "Loading records…" }: { rows?: number; columns?: number; label?: string }) {
  return (
    <LoadingRegion label={label} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <Bone className="h-5 w-40" />
        <Bone className="h-4 w-16" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, column) => (
              <Bone key={column} className={cn("h-4", column === 0 ? "w-4/5" : "w-2/3")} />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function HeroSkeleton() {
  return (
    <section className="border-b border-[#e8e8e8] bg-white px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <Bone className="h-10 w-full max-w-xl sm:h-14" />
        <Bone className="mt-3 h-10 w-2/3 max-w-md sm:h-14" />
        <Bone className="mt-6 h-4 w-full max-w-2xl" />
        <Bone className="mt-2 h-4 w-4/5 max-w-xl" />
      </div>
    </section>
  );
}

export function StatRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-white p-5">
          <Bone className="size-6 rounded-lg" />
          <Bone className="mt-4 h-3.5 w-32" />
          <Bone className="mt-2 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Route-level loading UI. Wrapped in a ViewTransition so the skeleton sinks
 * and fades as the streamed content arrives (Suspense reveal).
 */
export function PageSkeleton({
  variant = "cards",
  label = "Loading page…",
  admin = false,
}: {
  variant?: "cards" | "list" | "table" | "detail";
  label?: string;
  admin?: boolean;
}) {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <main className={cn("min-h-screen", admin ? "bg-[#f7f8f5] p-5 sm:p-8" : "bg-[#f7f8f5]")}>
        {admin ? (
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Bone className="h-4 w-14" />
                <Bone className="mt-3 h-7 w-56" />
                <Bone className="mt-2 h-4 w-72" />
              </div>
              <Bone className="h-11 w-32 rounded-lg" />
            </div>
            <TableSkeleton label={label} />
          </div>
        ) : (
          <>
            <HeroSkeleton />
            <div className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:px-8">
              {variant === "detail" ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                  <div className="space-y-4">
                    <CardSkeleton lines={5} />
                    <CardSkeleton lines={4} />
                  </div>
                  <CardSkeleton lines={6} />
                </div>
              ) : variant === "list" ? (
                <ListSkeleton label={label} />
              ) : variant === "table" ? (
                <TableSkeleton label={label} />
              ) : (
                <>
                  <StatRowSkeleton />
                  <CardGridSkeleton label={label} className="grid gap-5 lg:grid-cols-2" count={4} />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </ViewTransition>
  );
}
