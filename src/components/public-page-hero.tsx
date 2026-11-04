import type { ReactNode } from "react";

type PublicPageHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
};

export default function PublicPageHero({
  eyebrow,
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
      className={`border-b border-[#e8e8e8] bg-white px-5 py-8 text-[#171717] sm:px-8 sm:py-12 ${className}`}
    >
      <div
        className={`mx-auto grid max-w-7xl items-end gap-8 ${
          aside ? "lg:grid-cols-[1fr_auto]" : ""
        } ${containerClassName}`}
      >
        <div className={`max-w-3xl ${contentClassName}`}>
          {eyebrow ? (
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#ff6600]">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>

          <div className="mt-5 max-w-2xl text-base leading-7 text-[#666] sm:text-lg sm:leading-8">
            {description}
          </div>

          {children}
        </div>

        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
