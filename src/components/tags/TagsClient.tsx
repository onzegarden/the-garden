"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { Inspiration } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/contexts/ToastContext";
import { MergeTagsModal } from "./MergeTagsModal";
import { TagPreviewModal } from "./TagPreviewModal";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TagItem {
  name: string;
  count: number;
}

interface TagsClientProps {
  initialInspirations: Inspiration[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TagsClient({ initialInspirations }: TagsClientProps) {
  const [inspirations, setInspirations] = useState<Inspiration[]>(initialInspirations);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Rename state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Click disambiguation (single vs double)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview modal
  const [previewTag, setPreviewTag] = useState<string | null>(null);

  // Delete — confirmDeleteTag holds the tag name pending confirmation
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);

  // Merge modal
  const [showMergeModal, setShowMergeModal] = useState(false);

  const toast = useToast();

  // ── Derived: tag list ──────────────────────────────────────────────────────

  const allTags = useMemo<TagItem[]>(() => {
    const map = new Map<string, number>();
    for (const insp of inspirations) {
      for (const tag of insp.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [inspirations]);

  const filteredTags = useMemo<TagItem[]>(() => {
    if (!search.trim()) return allTags;
    const q = search.toLowerCase();
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, search]);

  // Inspirations for the preview modal (pre-filtered by previewTag)
  const previewInspirations = useMemo<Inspiration[]>(() => {
    if (!previewTag) return [];
    return inspirations.filter((i) => i.tags.includes(previewTag));
  }, [previewTag, inspirations]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const allFilteredSelected =
    filteredTags.length > 0 && filteredTags.every((t) => selected.has(t.name));

  const toggleTag = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredTags.forEach((t) => next.delete(t.name));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredTags.forEach((t) => next.add(t.name));
        return next;
      });
    }
  };

  // ── Inline rename ──────────────────────────────────────────────────────────

  const startEditingTag = useCallback((name: string) => {
    setEditingTag(name);
    setEditValue(name);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 30);
  }, []);

  const commitRenameTag = useCallback(
    async (oldName: string) => {
      const newName = editValue.trim().toLowerCase().replace(/\s+/g, "-");
      setEditingTag(null);

      if (!newName || newName === oldName) return;

      const supabase = createClient();
      const affected = inspirations.filter((i) => i.tags.includes(oldName));

      try {
        await Promise.all(
          affected.map((i) => {
            const newTags = Array.from(
              new Set(i.tags.map((t) => (t === oldName ? newName : t)))
            );
            return supabase.from("inspirations").update({ tags: newTags }).eq("id", i.id);
          })
        );

        setInspirations((prev) =>
          prev.map((i) =>
            i.tags.includes(oldName)
              ? {
                  ...i,
                  tags: Array.from(
                    new Set(i.tags.map((t) => (t === oldName ? newName : t)))
                  ),
                }
              : i
          )
        );

        // Keep selection in sync
        setSelected((prev) => {
          if (!prev.has(oldName)) return prev;
          const next = new Set(prev);
          next.delete(oldName);
          next.add(newName);
          return next;
        });

        toast.success("Tag renommé");
      } catch {
        toast.error("Impossible de renommer le tag");
      }
    },
    [editValue, inspirations, toast]
  );

  // ── Click disambiguation: single → preview, double → rename ───────────────

  const handleTagNameClick = useCallback(
    (name: string) => {
      if (clickTimerRef.current) {
        // Second click arrived within 220ms → double-click → rename
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        startEditingTag(name);
      } else {
        // First click → wait 220ms, then open preview if no second click
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          setPreviewTag(name);
        }, 220);
      }
    },
    [startEditingTag]
  );

  // ── Delete tag ─────────────────────────────────────────────────────────────

  const handleDeleteTag = useCallback(
    async (tagName: string) => {
      if (deletingTag) return;
      // Show inline confirmation instead of window.confirm
      setConfirmDeleteTag(tagName);
    },
    [deletingTag]
  );

  const confirmAndDelete = useCallback(
    async (tagName: string) => {
      setConfirmDeleteTag(null);
      setDeletingTag(tagName);
      const supabase = createClient();
      const affected = inspirations.filter((i) => i.tags.includes(tagName));

      try {
        await Promise.all(
          affected.map((i) =>
            supabase
              .from("inspirations")
              .update({ tags: i.tags.filter((t) => t !== tagName) })
              .eq("id", i.id)
          )
        );

        setInspirations((prev) =>
          prev.map((i) =>
            i.tags.includes(tagName)
              ? { ...i, tags: i.tags.filter((t) => t !== tagName) }
              : i
          )
        );
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(tagName);
          return next;
        });
        toast.success(`Tag #${tagName} supprimé`);
      } catch {
        toast.error("Impossible de supprimer le tag");
      } finally {
        setDeletingTag(null);
      }
    },
    [inspirations, toast]
  );

  // ── After merge ────────────────────────────────────────────────────────────

  const handleMerged = useCallback(
    (updatedInspirations: Inspiration[], _removedTags: string[], targetTag: string) => {
      setInspirations(updatedInspirations);
      setSelected(new Set());
      toast.success(`Tags fusionnés → #${targetTag} ✓`);
      setShowMergeModal(false);
    },
    [toast]
  );

  // ── After a tag is removed from one inspiration in the preview modal ───────

  const handleTagRemoved = useCallback((updated: Inspiration) => {
    setInspirations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-garden-black dark:text-white">Tags</h1>
          <p className="font-mono text-xs text-garden-text-muted dark:text-gray-400 mt-0.5">
            {allTags.length} tag{allTags.length !== 1 ? "s" : ""} dans votre jardin
          </p>
        </div>

        {selected.size >= 2 && (
          <button
            onClick={() => setShowMergeModal(true)}
            className="btn-primary text-sm"
          >
            Fusionner {selected.size} tags
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-8 pb-4 shrink-0">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-text-muted dark:text-gray-400 pointer-events-none select-none text-sm">
            ⌕
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les tags…"
            className="input-base pl-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-garden-text-muted dark:text-gray-400 hover:text-garden-black dark:hover:text-white transition-colors text-sm"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="px-8 pb-3 font-mono text-[10px] text-garden-text-muted/60 dark:text-gray-500 shrink-0">
        Clic pour prévisualiser · Double-clic pour renommer
      </p>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {filteredTags.length === 0 ? (
          search.trim() ? (
            <EmptyState
              icon="🔍"
              title="Aucun tag correspondant"
              subtitle="Essaie avec un autre mot-clé"
            />
          ) : (
            <EmptyState
              icon="🏷️"
              title="Aucun tag créé"
              subtitle="Les tags apparaîtront ici quand tu commenceras à organiser tes inspirations"
            />
          )
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-garden-border dark:border-gray-700">
                <th className="w-8 pb-2.5 pr-3 text-left">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="accent-garden-yellow w-3.5 h-3.5 cursor-pointer"
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="pb-2.5 text-left font-mono text-[11px] text-garden-text-muted dark:text-gray-500 uppercase tracking-wide">
                  Tag
                </th>
                <th className="pb-2.5 text-right font-mono text-[11px] text-garden-text-muted dark:text-gray-500 uppercase tracking-wide w-28">
                  Inspirations
                </th>
                <th className="pb-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag) => {
                const isSelected = selected.has(tag.name);
                const isDeleting = deletingTag === tag.name;
                const isEditing = editingTag === tag.name;
                const isConfirmingDelete = confirmDeleteTag === tag.name;

                return (
                  <tr
                    key={tag.name}
                    className={`
                      border-b border-garden-border/50 dark:border-gray-700/50 transition-colors duration-100
                      ${isSelected ? "bg-garden-yellow/10 dark:bg-yellow-400/10" : "hover:bg-garden-surface dark:hover:bg-gray-800"}
                    `}
                  >
                    {/* Checkbox */}
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTag(tag.name)}
                        className="accent-garden-yellow w-3.5 h-3.5 cursor-pointer"
                        aria-label={`Sélectionner #${tag.name}`}
                      />
                    </td>

                    {/* Tag name — click=preview, double-click=rename */}
                    <td className="py-2.5">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitRenameTag(tag.name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitRenameTag(tag.name);
                            }
                            if (e.key === "Escape") {
                              setEditingTag(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="
                            font-mono text-sm text-garden-black dark:text-white
                            bg-white dark:bg-gray-800 border border-garden-green dark:border-garden-yellow rounded px-2 py-0.5
                            outline-none focus:ring-1 focus:ring-garden-green/30 dark:focus:ring-garden-yellow/30
                            w-48
                          "
                          aria-label={`Renommer le tag ${tag.name}`}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTagNameClick(tag.name)}
                          className="
                            font-mono text-sm text-garden-black dark:text-gray-200
                            hover:text-garden-green dark:hover:text-white transition-colors duration-150
                            text-left
                          "
                          title="Clic : prévisualiser · Double-clic : renommer"
                        >
                          #{tag.name}
                        </button>
                      )}
                    </td>

                    {/* Count */}
                    <td className="py-3 text-right font-mono text-xs text-garden-text-muted dark:text-gray-500">
                      {tag.count}
                    </td>

                    {/* Delete — shows inline confirmation on first click */}
                    <td className="py-3 text-right">
                      {isConfirmingDelete ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => confirmAndDelete(tag.name)}
                            className="font-mono text-xs text-red-600 hover:underline"
                            aria-label={`Confirmer la suppression du tag ${tag.name}`}
                          >
                            Oui
                          </button>
                          <span className="text-garden-border font-mono text-xs">|</span>
                          <button
                            onClick={() => setConfirmDeleteTag(null)}
                            className="font-mono text-xs text-garden-text-muted hover:underline"
                            aria-label="Annuler la suppression"
                          >
                            Non
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteTag(tag.name)}
                          disabled={isDeleting || isEditing}
                          className="text-garden-text-muted hover:text-red-500 transition-colors font-mono text-base disabled:opacity-40 px-1 leading-none"
                          title={`Supprimer #${tag.name}`}
                          aria-label={`Supprimer le tag ${tag.name}`}
                        >
                          {isDeleting ? "…" : "×"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Selection footer bar */}
      {selected.size > 0 && (
        <div className="shrink-0 border-t border-garden-border dark:border-gray-700 bg-white dark:bg-gray-900 px-8 py-3 flex items-center justify-between animate-fade-in">
          <span className="font-mono text-xs text-garden-text-muted dark:text-gray-400">
            {selected.size} tag{selected.size !== 1 ? "s" : ""} sélectionné
            {selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="font-mono text-xs text-garden-text-muted dark:text-gray-400 hover:text-garden-black dark:hover:text-white transition-colors"
            >
              Désélectionner
            </button>
            {selected.size >= 2 && (
              <button
                onClick={() => setShowMergeModal(true)}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Fusionner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <MergeTagsModal
          selectedTags={selectedArray}
          inspirations={inspirations}
          onMerged={handleMerged}
          onClose={() => setShowMergeModal(false)}
        />
      )}

      {/* Preview Modal */}
      {previewTag && (
        <TagPreviewModal
          tagName={previewTag}
          inspirations={previewInspirations}
          onTagRemoved={handleTagRemoved}
          onClose={() => setPreviewTag(null)}
        />
      )}
    </div>
  );
}
