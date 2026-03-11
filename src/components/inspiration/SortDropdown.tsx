"use client";

import type { SortKind } from "@/lib/types";

// ── Data ──────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKind; label: string }[] = [
  { value: "recent",          label: "Plus récent" },
  { value: "oldest",          label: "Plus ancien" },
  { value: "favorites-first", label: "Favoris d'abord" },
  { value: "by-type",         label: "Par type" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface SortDropdownProps {
  value: SortKind;
  onChange: (val: SortKind) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const isActive = value !== "recent";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Sort icon — subtle visual hint */}
      <span className="font-mono text-[11px] text-garden-text-muted dark:text-white/40 select-none pointer-events-none">
        ↕
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortKind)}
          aria-label="Trier par"
          className={`
            appearance-none font-mono text-xs pl-3 pr-6 py-1.5 rounded-tag border
            cursor-pointer transition-colors duration-150
            focus:outline-none focus:ring-1 focus:ring-garden-green/20
            ${
              isActive
                ? "bg-garden-green text-white border-garden-green"
                : "bg-white dark:bg-white/5 text-garden-text-muted dark:text-white/50 border-garden-border dark:border-white/10 hover:border-garden-green hover:text-garden-green"
            }
          `}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom arrow */}
        <span
          className={`
            absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[9px]
            ${isActive ? "text-white/80" : "text-garden-text-muted dark:text-white/40"}
          `}
        >
          ▾
        </span>
      </div>
    </div>
  );
}
