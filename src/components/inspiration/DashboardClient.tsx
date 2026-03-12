"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Inspiration, FilterKind, SortKind } from "@/lib/types";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { InspirationCard } from "./InspirationCard";
import { InspirationDetail } from "./InspirationDetail";
import { AddInspirationModal } from "./AddInspirationModal";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { SortDropdown } from "./SortDropdown";
import { createClient } from "@/lib/supabase/client";

interface DashboardClientProps {
  initialInspirations: Inspiration[];
}

export function DashboardClient({ initialInspirations }: DashboardClientProps) {
  const { activeView, setActiveView, selectedGardenId, gardens } = useDashboard();
  const toast = useToast();

  const [inspirations, setInspirations] = useState<Inspiration[]>(initialInspirations);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterKind>("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<SortKind>("recent");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when sidebar "Recherche" is clicked
  useEffect(() => {
    if (activeView === "search") {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [activeView]);

  // Auto-open an inspiration when navigated from the tags page via "Ouvrir"
  useEffect(() => {
    const pendingId = localStorage.getItem("garden:openInspiration");
    if (!pendingId) return;
    localStorage.removeItem("garden:openInspiration");
    setSelectedId(pendingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally runs only on mount

  // Apply a tag filter when navigated from the tags page via "Voir dans le jardin"
  useEffect(() => {
    const pendingTag = localStorage.getItem("garden:activeTag");
    if (!pendingTag) return;
    localStorage.removeItem("garden:activeTag");
    setActiveTagFilter(pendingTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally runs only on mount

  // ── Derived filtered + sorted list ───────────────────────
  const filtered = useMemo(() => {
    // Archives view shows only archived items; all other views hide archived items
    let list = activeView === "archives"
      ? inspirations.filter((i) => i.is_archived)
      : inspirations.filter((i) => !i.is_archived);

    if (selectedGardenId !== null) {
      list = list.filter((i) => i.garden_id === selectedGardenId);
    }

    if (activeView === "favorites") {
      list = list.filter((i) => i.is_favorite);
    } else if (activeView !== "archives" && typeFilter !== "all") {
      list = list.filter((i) => i.type === typeFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeTagFilter) {
      list = list.filter((i) => i.tags.includes(activeTagFilter));
    }

    // ── Sort ─────────────────────────────────────────────
    // "image" → "link" → "text" → "video" for "by-type"
    const TYPE_ORDER: Record<string, number> = { image: 0, link: 1, text: 2, video: 3 };

    return [...list].sort((a, b) => {
      const byDate = (x: Inspiration, y: Inspiration) =>
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime();

      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

        case "favorites-first":
          if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
          return byDate(a, b);

        case "by-type":
          if (a.type !== b.type)
            return (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
          return byDate(a, b);

        case "recent":
        default:
          return byDate(a, b);
      }
    });
  }, [inspirations, selectedGardenId, activeView, typeFilter, query, activeTagFilter, sortBy]);

  const selectedInspiration = useMemo(
    () => inspirations.find((i) => i.id === selectedId) ?? null,
    [inspirations, selectedId]
  );

  // All unique tags across the garden, sorted by frequency (most used first)
  const allExistingTags = useMemo(() => {
    const freq: Record<string, number> = {};
    inspirations.forEach((insp) => {
      insp.tags.forEach((tag) => {
        freq[tag] = (freq[tag] ?? 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [inspirations]);

  const pageTitle = useMemo(() => {
    if (activeView === "favorites") return "Favoris";
    if (activeView === "search") return "Recherche";
    if (activeView === "archives") return "Archives";
    if (selectedGardenId) {
      return gardens.find((g) => g.id === selectedGardenId)?.name ?? "Jardin";
    }
    return "Mon Jardin";
  }, [activeView, selectedGardenId, gardens]);

  // Count for the subtitle — respects archive/non-archive split and garden filter
  const totalCount = useMemo(() => {
    const base = activeView === "archives"
      ? inspirations.filter((i) => i.is_archived)
      : inspirations.filter((i) => !i.is_archived);
    return selectedGardenId
      ? base.filter((i) => i.garden_id === selectedGardenId).length
      : base.length;
  }, [inspirations, activeView, selectedGardenId]);

  // ── Handlers ──────────────────────────────────────────────
  const handleAdd = useCallback((inspiration: Inspiration) => {
    setInspirations((prev) => [inspiration, ...prev]);
    setShowAdd(false);
    toast.success("Graine plantée 🌱");
  }, [toast]);

  const handleUpdate = useCallback((updated: Inspiration) => {
    setInspirations((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    );
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("inspirations").delete().eq("id", id);
    if (error) {
      toast.error("Impossible de supprimer l'inspiration");
      return;
    }
    setInspirations((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    toast.success("Inspiration supprimée");
  }, [toast]);

  // Toggle active tag filter (click same tag again to clear)
  const handleTagClick = useCallback((tag: string) => {
    setActiveTagFilter((prev) => (prev === tag ? null : tag));
    setSelectedId(null); // close detail panel if open
  }, []);

  const handleFavorite = useCallback(
    async (id: string, value: boolean) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inspirations")
        .update({ is_favorite: value })
        .eq("id", id)
        .select()
        .single();
      if (data) {
        handleUpdate(data as Inspiration);
        toast.success(value ? "Ajouté aux favoris ⭐" : "Retiré des favoris");
      } else if (error) {
        toast.error("Impossible de mettre à jour le favori");
      }
    },
    [handleUpdate, toast]
  );

  return (
    <>
      {/* ─── Header ─── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-display-md font-bold text-garden-black dark:text-white mb-1">
              {pageTitle}
            </h1>
            <p className="font-mono text-xs text-garden-text-muted dark:text-white/50">
              {filtered.length !== totalCount
                ? `${filtered.length} / ${totalCount}`
                : totalCount}{" "}
              inspiration{totalCount !== 1 ? "s" : ""}{" "}
              {activeView === "archives"
                ? `archivée${totalCount !== 1 ? "s" : ""}`
                : `cultivée${totalCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          {activeView !== "archives" && (
            <button onClick={() => setShowAdd(true)} className="hidden sm:block btn-primary shrink-0">
              + Planter une graine
            </button>
          )}
        </div>

        {/* Active tag filter banner */}
        {activeTagFilter && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-garden-green rounded-card mb-4 animate-fade-in">
            <span className="font-mono text-xs text-white/70">Tag actif :</span>
            <span className="font-mono text-xs text-garden-yellow font-medium">
              #{activeTagFilter}
            </span>
            <button
              onClick={() => setActiveTagFilter(null)}
              className="ml-auto text-white/60 hover:text-white transition-colors font-mono text-lg leading-none"
              aria-label="Retirer le filtre par tag"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={(v) => {
              setQuery(v);
              if (v) setActiveView("search");
              else if (activeView === "search") setActiveView("all");
            }}
          />
          <div className="flex items-center gap-2">
            {activeView !== "favorites" && (
              <FilterBar active={typeFilter} onChange={setTypeFilter} />
            )}
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {/* ─── Grid or Empty ─── */}
      {filtered.length === 0 ? (
        <EmptyState
          hasInspirations={totalCount > 0}
          isGardenView={selectedGardenId !== null}
          isArchiveView={activeView === "archives"}
          onAdd={() => setShowAdd(true)}
        />
      ) : (
        <div className="masonry-grid">
          {filtered.map((inspiration) => (
            <div
              key={inspiration.id}
              className={`masonry-item${activeView === "archives" ? " opacity-[0.82]" : ""}`}
            >
              <InspirationCard
                inspiration={inspiration}
                onClick={() => setSelectedId(inspiration.id)}
                onFavorite={(val) => handleFavorite(inspiration.id, val)}
                onTagClick={handleTagClick}
                activeTagFilter={activeTagFilter}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Mobile FAB ── */}
      {activeView !== "archives" && (
        <button
          onClick={() => setShowAdd(true)}
          className="sm:hidden fixed bottom-safe-6 right-6 z-20 w-14 h-14 bg-garden-green dark:bg-garden-green text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-light leading-none active:scale-95 transition-transform"
          aria-label="Planter une graine"
        >
          +
        </button>
      )}

      {showAdd && (
        <AddInspirationModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
          defaultGardenId={selectedGardenId}
          existingTags={allExistingTags}
        />
      )}

      {selectedInspiration && (
        <InspirationDetail
          inspiration={selectedInspiration}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onFavorite={handleFavorite}
          onTagClick={handleTagClick}
          activeTagFilter={activeTagFilter}
          existingTags={allExistingTags}
        />
      )}
    </>
  );
}

function EmptyState({
  hasInspirations,
  isGardenView,
  isArchiveView,
  onAdd,
}: {
  hasInspirations: boolean;
  isGardenView: boolean;
  isArchiveView: boolean;
  onAdd: () => void;
}) {
  const title = hasInspirations
    ? "Aucun résultat"
    : isArchiveView
    ? "Aucune archive"
    : isGardenView
    ? "Ce jardin est vide"
    : "Ton jardin t'attend";

  const subtitle = hasInspirations
    ? "Essaie de modifier ta recherche ou tes filtres."
    : isArchiveView
    ? "Les inspirations archivées apparaîtront ici."
    : isGardenView
    ? "Plante ta première graine dans ce jardin — une image, un texte, un lien, une vidéo."
    : "Plante ta première graine — une image, un texte, un lien, une vidéo.";

  const emoji = isArchiveView ? "📦" : isGardenView && !hasInspirations ? "🌿" : "🌱";

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-garden-green-muted dark:bg-white/5 rounded-full flex items-center justify-center mb-6 text-3xl">
        {emoji}
      </div>
      <h2 className="text-display-sm font-bold text-garden-black dark:text-white mb-3">{title}</h2>
      <p className="font-sans font-extralight text-garden-text-muted dark:text-white/50 max-w-xs leading-relaxed mb-8">
        {subtitle}
      </p>
      {!hasInspirations && !isArchiveView && (
        <button onClick={onAdd} className="btn-primary">
          Planter une graine
        </button>
      )}
    </div>
  );
}
