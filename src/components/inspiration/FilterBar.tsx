"use client";

import type { FilterKind } from "@/lib/types";

const filters: { label: string; value: FilterKind }[] = [
  { label: "Toutes", value: "all" },
  { label: "⭐ Favoris", value: "favorites" },
  { label: "◈ Images", value: "image" },
  { label: "❝ Textes", value: "text" },
  { label: "⌁ Liens", value: "link" },
  { label: "▷ Vidéos", value: "video" },
];

interface FilterBarProps {
  active: FilterKind;
  onChange: (val: FilterKind) => void;
}

export function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`shrink-0 font-mono text-xs px-3 py-1.5 rounded-tag border transition-all duration-200
            ${
              active === f.value
                ? "bg-garden-green text-white border-garden-green"
                : "bg-white dark:bg-white/5 text-garden-text-muted dark:text-white/50 border-garden-border dark:border-white/10 hover:border-garden-green hover:text-garden-green dark:hover:border-white/40 dark:hover:text-white"
            }
          `}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
