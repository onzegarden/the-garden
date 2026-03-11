"use client";

import { useState, useMemo } from "react";
import type { Inspiration } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MergeTagsModalProps {
  selectedTags: string[];
  inspirations: Inspiration[];
  onMerged: (
    updatedInspirations: Inspiration[],
    removedTags: string[],
    targetTag: string
  ) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MergeTagsModal({
  selectedTags,
  inspirations,
  onMerged,
  onClose,
}: MergeTagsModalProps) {
  const [choice, setChoice] = useState<"existing" | "new">("existing");
  const [existingTarget, setExistingTarget] = useState<string>(selectedTags[0]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute the final tag name (slugified if "new")
  const finalTarget =
    choice === "new"
      ? newName.trim().toLowerCase().replace(/\s+/g, "-")
      : existingTarget;

  // Preview: inspirations that will be updated
  const affected = useMemo(
    () => inspirations.filter((i) => i.tags.some((t) => selectedTags.includes(t))),
    [inspirations, selectedTags]
  );

  const isValid =
    choice === "existing" ? Boolean(existingTarget) : newName.trim().length > 0;

  // ── Merge ────────────────────────────────────────────────────────────────

  const handleMerge = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const updated: Inspiration[] = [];

      await Promise.all(
        affected.map(async (i) => {
          // Replace each selected tag with finalTarget, deduplicate
          const newTags = Array.from(
            new Set(i.tags.map((t) => (selectedTags.includes(t) ? finalTarget : t)))
          );
          const { data } = await supabase
            .from("inspirations")
            .update({ tags: newTags })
            .eq("id", i.id)
            .select()
            .single();
          if (data) updated.push(data as Inspiration);
        })
      );

      // Merge updated rows back into the full inspirations list
      const updatedIds = new Set(updated.map((i) => i.id));
      const updatedAll = inspirations.map((i) =>
        updatedIds.has(i.id) ? (updated.find((u) => u.id === i.id) as Inspiration) : i
      );

      onMerged(updatedAll, selectedTags, finalTarget);
    } catch {
      setError("Une erreur est survenue. Réessaye.");
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Fusionner ${selectedTags.length} tags`}
        className="relative bg-white dark:bg-gray-900 rounded-card shadow-modal w-full max-w-md mx-4 p-6 flex flex-col gap-5 animate-scale-in"
      >

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-sans text-base font-semibold text-garden-black dark:text-white">
              Fusionner {selectedTags.length} tags
            </h2>
            <p className="font-mono text-xs text-garden-text-muted dark:text-gray-400 mt-0.5">
              {affected.length} inspiration{affected.length !== 1 ? "s" : ""} affectée
              {affected.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-garden-text-muted dark:text-gray-400 hover:text-garden-black dark:hover:text-white transition-colors font-mono text-xl leading-none mt-0.5"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Tags preview */}
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-xs px-2 py-0.5 rounded-tag border border-garden-border dark:border-gray-600 bg-garden-surface dark:bg-gray-800 text-garden-text-muted dark:text-gray-300"
            >
              #{tag}
            </span>
          ))}
          <span className="font-mono text-xs text-garden-text-muted dark:text-gray-400">→</span>
          <span
            className={`
              font-mono text-xs px-2 py-0.5 rounded-tag border font-medium
              ${
                finalTarget
                  ? "border-garden-green bg-garden-green/5 text-garden-green"
                  : "border-garden-border text-garden-text-muted opacity-50"
              }
            `}
          >
            #{finalTarget || "…"}
          </span>
        </div>

        {/* Choice: keep existing tag */}
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="mergeChoice"
              checked={choice === "existing"}
              onChange={() => setChoice("existing")}
              className="accent-garden-green w-3.5 h-3.5 shrink-0"
            />
            <span className="font-sans text-sm text-garden-black dark:text-gray-200">
              Utiliser un tag existant
            </span>
          </label>

          {choice === "existing" && (
            <div className="ml-6 flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setExistingTarget(tag)}
                  className={`
                    font-mono text-xs px-2.5 py-1 rounded-tag border transition-all duration-150
                    ${
                      existingTarget === tag
                        ? "bg-garden-green text-white border-garden-green"
                        : "bg-white text-garden-text-muted border-garden-border hover:border-garden-green hover:text-garden-green"
                    }
                  `}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Choice: new name */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="mergeChoice"
              checked={choice === "new"}
              onChange={() => setChoice("new")}
              className="accent-garden-green w-3.5 h-3.5 shrink-0"
            />
            <span className="font-sans text-sm text-garden-black dark:text-gray-200">
              Choisir un nouveau nom
            </span>
          </label>

          {choice === "new" && (
            <div className="ml-6">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleMerge();
                  if (e.key === "Escape") onClose();
                }}
                placeholder="nouveau-tag"
                className="input-base text-sm"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              {newName.trim() && (
                <p className="font-mono text-[10px] text-garden-text-muted dark:text-gray-400 mt-1.5">
                  Sera enregistré comme :{" "}
                  <span className="text-garden-green dark:text-green-400">
                    #{newName.trim().toLowerCase().replace(/\s+/g, "-")}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="font-mono text-xs text-red-500">{error}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={!isValid || loading}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Fusion en cours…" : "Fusionner"}
          </button>
        </div>
      </div>
    </div>
  );
}
