"use client";

import { forwardRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({ value, onChange }, ref) {
    return (
      <div className="relative flex-1 max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-text-muted pointer-events-none select-none text-sm">
          ⌕
        </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Chercher par titre, tag, note…"
          className="input-base pl-8"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-garden-text-muted hover:text-garden-black transition-colors text-sm"
            aria-label="Effacer la recherche"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);
