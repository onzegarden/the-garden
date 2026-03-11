"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Tag } from "./Tag";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** All tags from the user's garden, for autocomplete suggestions */
  existingTags?: string[];
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Ajouter un tag…",
  existingTags = [],
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize raw value into a slug
  const toSlug = (v: string) =>
    v.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

  const addTag = (value: string) => {
    const clean = toSlug(value);
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInput("");
    setOpen(false);
    setActiveIdx(-1);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  // Suggestions: existing tags containing the input text, exclude already-added tags, max 5
  const suggestions =
    input.trim().length > 0
      ? existingTags
          .filter(
            (t) =>
              !tags.includes(t) &&
              t.toLowerCase().includes(input.trim().toLowerCase())
          )
          .slice(0, 5)
      : [];

  const cleanInput = toSlug(input);

  // Show "Créer #tag" when the typed slug is new (not in suggestions and not already added)
  const showCreate =
    cleanInput.length > 0 &&
    !tags.includes(cleanInput) &&
    !suggestions.includes(cleanInput);

  const totalItems = suggestions.length + (showCreate ? 1 : 0);
  const showDropdown = open && input.trim().length > 0 && totalItems > 0;

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // ── Dropdown navigation ────────────────────────────────────
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((prev) => Math.min(prev + 1, totalItems - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((prev) => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIdx(-1);
        return;
      }
      if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        if (activeIdx < suggestions.length) {
          addTag(suggestions[activeIdx]);
        } else {
          addTag(input); // "Créer" option
        }
        return;
      }
    }

    // ── Base key handling ──────────────────────────────────────
    if (e.key === "Enter") {
      e.preventDefault();
      if (input) addTag(input);
    } else if (e.key === "," || e.key === " ") {
      e.preventDefault();
      if (input) addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ── Input field ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 items-center min-h-[42px] w-full bg-white dark:bg-white/5 border border-garden-border dark:border-white/10 rounded-card px-3 py-2 focus-within:border-garden-green focus-within:ring-1 focus-within:ring-garden-green/20 transition-all duration-200">
        {tags.map((tag) => (
          <Tag key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // onMouseDown on dropdown buttons calls e.preventDefault() so blur
            // never fires from those clicks — safe to close + commit here
            setOpen(false);
            if (input.trim()) addTag(input);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] bg-transparent text-sm font-mono text-garden-black dark:text-white placeholder:text-garden-text-muted dark:placeholder:text-white/30 outline-none"
        />
      </div>

      {/* ── Autocomplete dropdown ────────────────────────── */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-garden-border dark:border-white/10 rounded-[8px] shadow-md overflow-hidden"
          style={{ animation: "fade-in 150ms ease forwards" }}
        >
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep input focused
              onClick={() => addTag(tag)}
              className={`w-full text-left px-3 py-2 font-mono text-sm transition-colors duration-100 ${
                activeIdx === i
                  ? "bg-garden-green/5 dark:bg-white/5 text-garden-green dark:text-white"
                  : "text-garden-black dark:text-white/70 hover:bg-garden-green/5 dark:hover:bg-white/5 hover:text-garden-green dark:hover:text-white"
              }`}
            >
              #{tag}
            </button>
          ))}

          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(input)}
              className={`w-full text-left px-3 py-2 font-mono text-sm italic transition-colors duration-100 ${
                activeIdx === suggestions.length
                  ? "bg-garden-yellow/10 dark:bg-garden-yellow/10 text-garden-black dark:text-white"
                  : "text-garden-text-muted dark:text-white/50 hover:bg-garden-yellow/10 hover:text-garden-black dark:hover:text-white"
              }`}
            >
              <span className="not-italic font-bold text-garden-green mr-1.5">+</span>
              Créer #{cleanInput}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
