"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { preload } from "swr";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileSearch,
  Gavel,
  Home,
  Info,
  Languages,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Search,
  ShieldAlert,
  Target,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Sheet } from "@/components/ui/sheet";
import { SpringDialog } from "@/components/ui/spring-dialog";
import { useIsCompact } from "@/hooks/use-media-query";
import { useLanguage } from "@/components/language-provider";
import { directionBetween, setNavDirection } from "@/components/navigation/nav-direction";
import { jsonFetcher, usePublicData } from "@/lib/swr";

const SEARCH_KEY = "/api/public/search";

type SearchIndex = {
  elections: { id: string; name: string; jurisdiction: string | null }[];
  promises: { id: string; title: string; sector: string | null }[];
};

type Entry = {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
};

const CommandMenuContext = createContext<{
  open: () => void;
  prefetch: () => void;
} | null>(null);

export function useCommandMenu() {
  const context = useContext(CommandMenuContext);
  if (!context) throw new Error("useCommandMenu must be used inside CommandMenuProvider");
  return context;
}

export function isMacLike() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const show = useCallback(() => {
    setEverOpened(true);
    setOpen(true);
  }, []);

  const prefetch = useCallback(() => {
    void preload(SEARCH_KEY, jsonFetcher);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setEverOpened(true);
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        show();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show]);

  const value = useMemo(() => ({ open: show, prefetch }), [show, prefetch]);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      {everOpened ? <CommandMenu open={open} onOpenChange={setOpen} /> : null}
    </CommandMenuContext.Provider>
  );
}

function CommandMenu({
  open,
  onOpenChange: setOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const compact = useIsCompact();
  const { t, language, setLanguage } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  const { data: index, isFirstLoad } = usePublicData<SearchIndex>(
    inAdmin ? null : SEARCH_KEY
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setQuery("");
      setOpen(next);
    },
    [setOpen]
  );

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      const url = new URL(href, window.location.href);
      const direction = directionBetween(window.location.pathname, url.pathname);
      if (direction) setNavDirection(direction);
      router.push(href);
    },
    [onOpenChange, router]
  );

  const pages: Entry[] = [
    { label: t("home"), href: "/", icon: Home },
    { label: t("electoralInformation"), href: "/electoral-information", icon: BookOpen },
    { label: t("navElections"), href: "/elections", icon: Vote, keywords: ["elections", "results", "candidates"] },
    { label: t("navVotingProcess"), href: "/electoral-information/voting-process", icon: ClipboardList, keywords: ["voting process"] },
    { label: t("navVoterRights"), href: "/electoral-information/voter-rights", icon: Gavel, keywords: ["voter rights"] },
    { label: t("navCivicResponsibility"), href: "/electoral-information/civic-responsibility", icon: Users, keywords: ["civic responsibility"] },
    { label: t("navReliableInformation"), href: "/electoral-information/reliable-information", icon: FileSearch, keywords: ["reliable information", "misinformation"] },
    { label: t("communityIssues"), href: "/community-issues", icon: MessageSquareText },
    { label: t("promiseTracker"), href: "/promise-tracker", icon: Target },
    { label: t("accountability"), href: "/accountability", icon: ShieldAlert },
    { label: t("about"), href: "/about", icon: Info },
  ];

  const adminPages: Entry[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Community issues", href: "/admin/community-issues", icon: MessageSquareText },
    { label: "Election incidents", href: "/admin/incidents", icon: ShieldAlert },
    { label: "Promises", href: "/admin/promises", icon: Target },
    { label: "Promise updates", href: "/admin/promise-updates", icon: ClipboardList },
    { label: "Electoral data", href: "/admin/electoral-data", icon: BookOpen },
    { label: "Elections", href: "/admin/electoral-data/elections", icon: Vote },
    { label: "Candidates", href: "/admin/electoral-data/candidates", icon: Users },
    { label: "Parties", href: "/admin/electoral-data/parties", icon: Users },
    { label: "Candidacies", href: "/admin/electoral-data/candidacies", icon: ClipboardList },
    { label: "Electoral areas", href: "/admin/electoral-data/areas", icon: MapPin },
    { label: "Results", href: "/admin/electoral-data/results", icon: Vote },
    { label: "Sources", href: "/admin/electoral-data/sources", icon: FileSearch },
    { label: "Staff", href: "/admin/staff", icon: Users },
  ];

  const hasQuery = query.trim().length > 0;

  const content = (
    <Command
      className="rounded-none! bg-transparent p-0"
      loop
    >
      <div className="px-2 pt-2">
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder={inAdmin ? "Jump to an admin page…" : t("cmdPlaceholder")}
          className="h-11 text-base sm:text-sm"
        />
      </div>
      <CommandList className="max-h-[min(60vh,26rem)] px-1 pb-2">
        <CommandEmpty>
          {isFirstLoad && hasQuery ? t("cmdSearching") : t("cmdNoResults")}
        </CommandEmpty>

        {inAdmin ? (
          <CommandGroup heading="Administration">
            {adminPages.map((entry) => (
              <MenuItem key={entry.href} entry={entry} onSelect={go} active={pathname === entry.href} currentLabel={t("cmdCurrent")} />
            ))}
          </CommandGroup>
        ) : (
          <>
            <CommandGroup heading={t("cmdGoTo")}>
              {pages.map((entry) => (
                <MenuItem key={entry.href} entry={entry} onSelect={go} active={pathname === entry.href} currentLabel={t("cmdCurrent")} />
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={t("cmdActions")}>
              <CommandItem
                value="report community issue submit"
                onSelect={() => go("/community-issues")}
              >
                <MessageSquareText />
                {t("reportIssue")}
              </CommandItem>
              <CommandItem
                value={`language switch ${language === "en" ? "hausa" : "english"}`}
                onSelect={() => {
                  setLanguage(language === "en" ? "ha" : "en");
                  onOpenChange(false);
                }}
              >
                <Languages />
                {t("cmdSwitchLanguage")}
              </CommandItem>
            </CommandGroup>

            {hasQuery && index?.elections.length ? (
              <CommandGroup heading={t("navElections")}>
                {index.elections.map((election) => (
                  <CommandItem
                    key={election.id}
                    value={`election ${election.name} ${election.jurisdiction ?? ""} ${election.id}`}
                    onSelect={() => go(`/elections/${election.id}`)}
                  >
                    <CalendarDays />
                    <span className="truncate">{election.name}</span>
                    {election.jurisdiction ? (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {election.jurisdiction}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {hasQuery && index?.promises.length ? (
              <CommandGroup heading={t("cmdPromises")}>
                {index.promises.map((promise) => (
                  <CommandItem
                    key={promise.id}
                    value={`promise ${promise.title} ${promise.sector ?? ""} ${promise.id}`}
                    onSelect={() => go(`/promise-tracker/${promise.id}`)}
                  >
                    <Target />
                    <span className="truncate">{promise.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        )}
      </CommandList>
      <div className="hidden items-center justify-between border-t border-black/5 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" /> Aminiya Tracker
        </span>
        <span className="flex items-center gap-3">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> {t("cmdHintMove")}</span>
          <span><Kbd>↵</Kbd> {t("cmdHintOpen")}</span>
          <span><Kbd>esc</Kbd> {t("cmdHintClose")}</span>
        </span>
      </div>
    </Command>
  );

  if (compact) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("navSearch")}
        hideTitle
        initialFocus={inputRef}
        className="h-[80dvh]"
      >
        {content}
      </Sheet>
    );
  }

  return (
    <SpringDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("cmdTitle")}
      hideTitle
      placement="top"
      initialFocus={inputRef}
      className="max-w-xl overflow-hidden"
    >
      {content}
    </SpringDialog>
  );
}

function MenuItem({
  entry,
  onSelect,
  active,
  currentLabel,
}: {
  entry: Entry;
  onSelect: (href: string) => void;
  active: boolean;
  currentLabel: string;
}) {
  const Icon = entry.icon;
  return (
    <CommandItem
      value={`${entry.label} ${entry.href} ${(entry.keywords ?? []).join(" ")}`}
      onSelect={() => onSelect(entry.href)}
    >
      <Icon />
      {entry.label}
      {active ? <CommandShortcut>{currentLabel}</CommandShortcut> : null}
    </CommandItem>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-black/10 bg-black/[0.03] px-1 font-sans text-[11px]">
      {children}
    </kbd>
  );
}
