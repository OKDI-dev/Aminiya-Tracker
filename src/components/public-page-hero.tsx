import type { ReactNode } from "react";
import BrandRings from "@/components/brand-rings";

type PublicPageHeroProps = {
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
};

/**
 * Interior page header on the navy ground (no kicker above the title: the
 * title carries the page). Title accents keep the
 * logo orange (6.4:1 on ink); anything passed as children sits on ink too,
 * so use the on-ink greys (`text-on-ink-muted`) and `text-signal` links.
 */
export default function PublicPageHero({
  title,
  description,
  children,
  aside,
  className = "",
  containerClassName = "",
  contentClassName = "",
}: PublicPageHeroProps) {
  return (
    <section
      className={`relative isolate overflow-hidden bg-ink px-5 py-10 text-white sm:px-8 sm:py-16 ${className}`}
    >
      <BrandRings className="top-1/2 left-[92%] hidden sm:block" size={900} />

      <div
        className={`mx-auto grid max-w-7xl items-end gap-8 ${
          aside ? "lg:grid-cols-[1fr_auto]" : ""
        } ${containerClassName}`}
      >
        <div className={`max-w-3xl ${contentClassName}`}>

          <h1 className="font-heading text-[clamp(2rem,6.5vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
            {title}
          </h1>

          <div className="mt-5 max-w-2xl text-base leading-7 text-on-ink-muted sm:text-lg sm:leading-8">
            {description}
          </div>

          {children}
        </div>

        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
