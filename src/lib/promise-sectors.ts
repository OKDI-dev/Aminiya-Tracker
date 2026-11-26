/**
 * Promise sectors: one list for the admin forms, the API and every public
 * page. A promise can cover several sectors; "Other" lets staff type one in.
 *
 * Storage: `political_promises.sectors` (text[], migration 025) holds the
 * known keys plus any typed-in sectors as plain text. `sector` keeps the
 * primary sector (the first known key, or "other") so older code and
 * databases without migration 025 still work.
 */

export const SECTOR_OPTIONS = [
  { key: "education", en: "Education", ha: "Ilimi" },
  { key: "healthcare", en: "Healthcare", ha: "Kiwon lafiya" },
  { key: "agriculture", en: "Agriculture", ha: "Noma" },
  { key: "infrastructure", en: "Infrastructure", ha: "Kayan more rayuwa" },
  { key: "employment", en: "Employment", ha: "Samar da ayyukan yi" },
  { key: "security", en: "Security", ha: "Tsaro" },
  { key: "water_sanitation", en: "Water and sanitation", ha: "Ruwa da tsaftar muhalli" },
  { key: "electricity", en: "Electricity", ha: "Wutar lantarki" },
  { key: "environment", en: "Environment", ha: "Muhalli" },
  { key: "governance", en: "Governance", ha: "Shugabanci" },
  { key: "youth_development", en: "Youth development", ha: "Ci gaban matasa" },
  { key: "women_development", en: "Women development", ha: "Ci gaban mata" },
  { key: "social_protection", en: "Social protection", ha: "Kariyar zamantakewa" },
] as const;

/** Older keys that may exist in data, so they still display with a label. */
const LEGACY_LABELS: Record<string, { en: string; ha: string }> = {
  health: { en: "Health", ha: "Lafiya" },
  roads_transport: { en: "Roads and transport", ha: "Hanyoyi da sufuri" },
  public_services: { en: "Public services", ha: "Ayyukan jama'a" },
  economy: { en: "Economy", ha: "Tattalin arziki" },
  other: { en: "Other", ha: "Sauran fannoni" },
};

const KNOWN = new Set<string>(SECTOR_OPTIONS.map((option) => option.key));
const MAX_SECTORS = 8;
const MAX_CUSTOM_LENGTH = 60;

export function sectorLabel(value: string, language: "en" | "ha" = "en") {
  const known = SECTOR_OPTIONS.find((option) => option.key === value) ?? LEGACY_LABELS[value];
  return known ? known[language] : value;
}

/** The sectors to show for a promise row, old (single `sector`) or new. */
export function promiseSectors(row: { sector?: string | null; sectors?: string[] | null }) {
  if (row.sectors && row.sectors.length) return row.sectors;
  return row.sector ? [row.sector] : [];
}

/** Split stored sectors back into form state: checked keys plus the typed-in text. */
export function sectorsToForm(row: { sector?: string | null; sectors?: string[] | null }) {
  const values = promiseSectors(row);
  const keys = values.filter((value) => KNOWN.has(value));
  const custom = values.filter((value) => !KNOWN.has(value) && value !== "other");
  return { keys, other: custom.join(", "), otherChecked: custom.length > 0 || values.includes("other") };
}

export type ParsedSectors = { sectors: string[]; primary: string } | { error: string };

/**
 * Validate submitted sectors. Accepts `sectors` (array of keys), `other`
 * (typed-in sector, used when the "other" key is included) and, for older
 * clients, a single `sector`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSectors(body: any): ParsedSectors {
  const raw: unknown[] = Array.isArray(body.sectors) ? body.sectors : body.sector ? [body.sector] : [];
  const keys = [...new Set(raw.map((value) => String(value ?? "").trim()).filter(Boolean))];

  const wantsOther = keys.includes("other");
  const unknown = keys.filter((key) => key !== "other" && !KNOWN.has(key));
  if (unknown.length) return { error: "Select sectors from the list, or use Other to type one in." };

  const custom = wantsOther
    ? String(body.other ?? "")
        .split(",")
        .map((value) => value.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    : [];

  if (wantsOther && custom.length === 0) return { error: "Type the sector name for Other." };
  if (custom.some((value) => value.length < 2 || value.length > MAX_CUSTOM_LENGTH)) {
    return { error: `Each typed-in sector must be 2 to ${MAX_CUSTOM_LENGTH} characters.` };
  }

  const sectors = [...keys.filter((key) => key !== "other"), ...custom];
  if (sectors.length === 0) return { error: "Select at least one sector." };
  if (sectors.length > MAX_SECTORS) return { error: `Select no more than ${MAX_SECTORS} sectors.` };

  const primary = sectors.find((value) => KNOWN.has(value)) ?? "other";
  return { sectors, primary };
}
