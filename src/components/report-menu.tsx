"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, LockKeyhole, MessageSquareText, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/** Where each kind of report is filed. */
export const reportDestinations = {
  community: "/community-issues",
  // Opens the incidents section and scrolls to the form itself, not the list.
  incident: "/electoral-information#report-incident",
} as const;

/**
 * Fired on window with `detail: boolean` whenever a report menu opens or
 * closes, so moving content elsewhere (the hero slideshow) can hold still.
 */
export const MENU_EVENT = "aminiya:menu-open";

const triggerStyles = {
  /** Header: solid ink pill, matching the logo's black wordmark. Phones get the menu sheet instead. */
  header:
    "hidden sm:inline-flex bg-ink text-white hover:bg-ink-raised data-[popup-open]:bg-ink-raised rounded-full px-4 py-2.5 text-sm",
  /** Hero: outline on the dark ink ground. */
  hero:
    "inline-flex min-h-12 rounded-xl border border-white/20 bg-paper-raised/[0.04] px-6 py-3 text-base text-white hover:border-white/40 hover:bg-paper-raised/[0.08] data-[popup-open]:border-white/40 data-[popup-open]:bg-paper-raised/[0.08]",
} as const;

/**
 * "Report an issue" as a menu: community issues and election incidents
 * go to different forms, so people choose before they land on one.
 */
export default function ReportMenu({
  variant,
  className = "",
}: {
  variant: keyof typeof triggerStyles;
  className?: string;
}) {
  const { t } = useLanguage();

  const items = [
    {
      href: reportDestinations.community,
      icon: MessageSquareText,
      title: t("reportMenuCommunityTitle"),
      description: t("reportMenuCommunityDesc"),
      note: t("reportMenuCommunityNote"),
    },
    {
      href: reportDestinations.incident,
      icon: ShieldAlert,
      title: t("reportMenuIncidentTitle"),
      description: t("reportMenuIncidentDesc"),
      note: t("reportMenuIncidentNote"),
    },
  ];

  return (
    <Menu.Root
      modal={false}
      onOpenChange={(open) => window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: open }))}
    >
      <Menu.Trigger
        className={`group items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${triggerStyles[variant]} ${className}`}
      >
        {t("reportIssue")}
        <ChevronDown
          size={variant === "hero" ? 18 : 16}
          aria-hidden="true"
          className="transition-transform duration-200 group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          className="z-[60] outline-none"
          sideOffset={10}
          align={variant === "header" ? "end" : "start"}
          collisionPadding={16}
        >
          <Menu.Popup className="w-[min(360px,calc(100vw-32px))] origin-[var(--transform-origin)] rounded-2xl border border-ink/5 bg-paper-raised p-1.5 text-ink shadow-[0_24px_60px_-20px_rgb(20_33_61/0.4)] outline-none transition-[scale,opacity] duration-150 ease-out data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0 motion-reduce:transition-opacity">
            <p className="px-3 pt-2 pb-1.5 text-xs font-semibold text-ink-subtle">
              {t("reportMenuHeading")}
            </p>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Menu.LinkItem
                  key={item.href}
                  closeOnClick
                  render={<Link href={item.href} />}
                  className="flex cursor-pointer gap-3 rounded-xl p-3 outline-none data-[highlighted]:bg-ink/[0.045]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-signal">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-ink-muted">
                      {item.description}
                    </span>
                    {/* Said before they commit: who sees what they send. */}
                    <span className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink">
                      <LockKeyhole size={13} className="mt-[3px] shrink-0 text-ink-subtle" aria-hidden="true" />
                      {item.note}
                    </span>
                  </span>
                </Menu.LinkItem>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
