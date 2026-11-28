"use client";

import { SECTOR_OPTIONS } from "@/lib/promise-sectors";

export type SectorSelection = { keys: string[]; otherChecked: boolean; other: string };

/** What the promise API expects: the checked keys (plus "other") and the typed-in text. */
export function sectorPayload(selection: SectorSelection) {
  return {
    sectors: [...selection.keys, ...(selection.otherChecked ? ["other"] : [])],
    other: selection.otherChecked ? selection.other : "",
  };
}

/** Pick one or more sectors; "Other" reveals a field to type the sector in. */
export default function SectorPicker({
  value,
  onChange,
}: {
  value: SectorSelection;
  onChange: (next: SectorSelection) => void;
}) {
  function toggle(key: string) {
    const keys = value.keys.includes(key)
      ? value.keys.filter((item) => item !== key)
      : [...value.keys, key];
    onChange({ ...value, keys });
  }

  const chipClass = (checked: boolean) =>
    `flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
      checked ? "border-ink bg-tint font-medium text-ink" : "border-line-soft bg-paper-raised text-ink-muted hover:border-line"
    }`;

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">
        Sectors <span className="text-red-600">*</span>
      </legend>
      <p className="mt-1 text-xs text-ink-subtle">Select every sector this promise covers.</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SECTOR_OPTIONS.map((option) => {
          const checked = value.keys.includes(option.key);
          return (
            <label key={option.key} className={chipClass(checked)}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.key)}
                className="size-4 shrink-0 accent-[var(--navy)]"
              />
              {option.en}
            </label>
          );
        })}
        <label className={chipClass(value.otherChecked)}>
          <input
            type="checkbox"
            checked={value.otherChecked}
            onChange={() => onChange({ ...value, otherChecked: !value.otherChecked })}
            className="size-4 shrink-0 accent-[var(--navy)]"
          />
          Other
        </label>
      </div>

      {value.otherChecked ? (
        <div className="mt-3">
          <label htmlFor="other_sector" className="text-sm font-medium text-ink">
            Other sector <span className="text-red-600">*</span>
          </label>
          <input
            id="other_sector"
            required
            maxLength={130}
            value={value.other}
            onChange={(event) => onChange({ ...value, other: event.target.value })}
            placeholder="e.g. Fisheries (separate several with commas)"
            className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-3 py-3 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal"
          />
        </div>
      ) : null}
    </fieldset>
  );
}
