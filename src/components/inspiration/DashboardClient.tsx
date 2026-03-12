"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Inspiration, FilterKind, SortKind } from "@/lib/types";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { SortableInspirationCard, DragOverlayCard } from "./SortableInspirationCard";
import { InspirationDetail } from "./InspirationDetail";
import { AddInspirationModal } from "./AddInspirationModal";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { SortDropdown } from "./SortDropdown";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { extractDomain } from "@/lib/utils";
import Fuse from "fuse.js";

interface DashboardClientProps {
  initialInspirations: Inspiration[];
}

export function DashboardClient({ initialInspirations }: DashboardClientProps) {
  const { activeView, setActiveView, selectedGardenId, gardens } = useDashboard();
  const toast = useToast();

  const [inspirations, setInspirations] = useState<Inspiration[]>(initialInspirations);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterKind>("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<SortKind>("recent");

  // ── Drag & drop ────────────────────────────────────────────────
  // Custom position order: IDs sorted by their `position` value
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    [...initialInspirations]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.id)
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mobile detection (drag disabled on sm breakpoint)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keep orderedIds in sync when inspirations are added or deleted
  useEffect(() => {
    setOrderedIds((prev) => {
      const existingSet = new Set(inspirations.map((i) => i.id));
      // New items (not yet in orderedIds) go to the front sorted by created_at desc
      const newIds = inspirations
        .filter((i) => !prev.includes(i.id))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .map((i) => i.id);
      return [...newIds, ...prev.filter((id) => existingSet.has(id))];
    });
  }, [inspirations]);

  // Debounced position save (500ms after last drag)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePositions = useCallback((ids: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
      await Promise.all(
        ids.map((id, index) =>
          supabase.from("inspirations").update({ position: index }).eq("id", id)
        )
      );
    }, 500);
  }, []);

  // dnd-kit sensors — require 8px movement before activating to preserve click behaviour
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Debounce query → debouncedQuery (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fuse.js index — rebuilt when inspirations change
  const fuse = useMemo(
    () =>
      new Fuse(
        inspirations.map((i) => ({
          ...i,
          _domain: extractDomain(i.source_url ?? ""),
        })),
        {
          keys: [
            { name: "title", weight: 3 },
            { name: "notes", weight: 2 },
            { name: "tags", weight: 2 },
            { name: "_domain", weight: 1 },
            { name: "content_url", weight: 0.5 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
          minMatchCharLength: 2,
          includeScore: true,
        }
      ),
    [inspirations]
  );

  // Set of IDs matching the fuzzy search (null = no active search)
  const fuseMatchIds = useMemo<Set<string> | null>(() => {
    if (!debouncedQuery.trim()) return null;
    return new Set(fuse.search(debouncedQuery).map((r) => r.item.id));
  }, [debouncedQuery, fuse]);

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

    // Fuzzy search via Fuse.js (applied after other filters)
    if (fuseMatchIds !== null) {
      list = list.filter((i) => fuseMatchIds.has(i.id));
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
  }, [inspirations, selectedGardenId, activeView, typeFilter, fuseMatchIds, activeTagFilter, sortBy]);

  // Drag is possible only in the unfiltered, unsearched view, on desktop
  const isDraggable = useMemo(
    () =>
      !debouncedQuery.trim() &&
      typeFilter === "all" &&
      !activeTagFilter &&
      !isMobile &&
      activeView !== "archives" &&
      activeView !== "favorites",
    [debouncedQuery, typeFilter, activeTagFilter, isMobile, activeView]
  );

  // When drag is active, override the sort order with orderedIds
  const displayList = useMemo(() => {
    if (!isDraggable) return filtered;
    const filteredSet = new Set(filtered.map((i) => i.id));
    const inspirationMap = new Map(inspirations.map((i) => [i.id, i]));
    return orderedIds
      .filter((id) => filteredSet.has(id))
      .map((id) => inspirationMap.get(id)!)
      .filter(Boolean);
  }, [isDraggable, orderedIds, filtered, inspirations]);

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

  // Determine which empty state to show
  type EmptyKind = "first-use" | "garden" | "search" | "filter" | "favorites" | "archives";
  const emptyKind = useMemo<EmptyKind | null>(() => {
    if (filtered.length > 0) return null;
    if (debouncedQuery.trim()) return "search";
    if (typeFilter !== "all" || activeTagFilter) return "filter";
    if (activeView === "favorites") return "favorites";
    if (activeView === "archives") return "archives";
    if (selectedGardenId !== null) return "garden";
    return "first-use";
  }, [filtered.length, debouncedQuery, typeFilter, activeTagFilter, activeView, selectedGardenId]);

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

  // ── Drag handlers ─────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;
      setOrderedIds((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        savePositions(newOrder);
        return newOrder;
      });
    },
    [savePositions]
  );

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
              {debouncedQuery.trim() ? (
                <>
                  {filtered.length}{" "}
                  inspiration{filtered.length !== 1 ? "s" : ""}{" "}
                  trouvée{filtered.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  {filtered.length !== totalCount
                    ? `${filtered.length} / ${totalCount}`
                    : totalCount}{" "}
                  inspiration{totalCount !== 1 ? "s" : ""}{" "}
                  {activeView === "archives"
                    ? `archivée${totalCount !== 1 ? "s" : ""}`
                    : `cultivée${totalCount !== 1 ? "s" : ""}`}
                </>
              )}
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
      {emptyKind !== null ? (
        <DashboardEmptyState kind={emptyKind} onAdd={() => setShowAdd(true)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayList.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div className="masonry-grid">
              {displayList.map((inspiration) => (
                <div key={inspiration.id} className="masonry-item">
                  <SortableInspirationCard
                    inspiration={inspiration}
                    isDraggable={isDraggable}
                    isArchived={activeView === "archives"}
                    onClick={() => setSelectedId(inspiration.id)}
                    onFavorite={(val) => handleFavorite(inspiration.id, val)}
                    onTagClick={handleTagClick}
                    activeTagFilter={activeTagFilter}
                    highlightQuery={debouncedQuery}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeId ? (() => {
              const insp = inspirations.find((i) => i.id === activeId);
              return insp ? (
                <DragOverlayCard
                  inspiration={insp}
                  onClick={() => {}}
                  onFavorite={() => {}}
                  onTagClick={handleTagClick}
                  activeTagFilter={activeTagFilter}
                  highlightQuery={debouncedQuery}
                />
              ) : null;
            })() : null}
          </DragOverlay>
        </DndContext>
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

type EmptyKind = "first-use" | "garden" | "search" | "filter" | "favorites" | "archives";

const EMPTY_CONFIGS: Record<EmptyKind, { icon: string; title: string; subtitle: string; showCta?: boolean }> = {
  "first-use": {
    icon: "🌱",
    title: "Ton jardin t'attend",
    subtitle: "Plante ta première graine pour commencer à cultiver tes inspirations",
    showCta: true,
  },
  "garden": {
    icon: "🌿",
    title: "Ce jardin est encore vide",
    subtitle: "Les graines que tu plantes ici prendront racine avec le temps",
    showCta: true,
  },
  "search": {
    icon: "🔍",
    title: "Aucune graine trouvée",
    subtitle: "Essaie avec d'autres mots ou explore ton jardin autrement",
  },
  "filter": {
    icon: "✨",
    title: "Aucune inspiration dans cette catégorie",
    subtitle: "Change de filtre ou explore une autre vue de ton jardin",
  },
  "favorites": {
    icon: "⭐",
    title: "Aucun favori pour le moment",
    subtitle: "Marque tes inspirations préférées pour les retrouver ici",
  },
  "archives": {
    icon: "📦",
    title: "Aucune inspiration archivée",
    subtitle: "Les inspirations que tu archives seront conservées ici",
  },
};

function DashboardEmptyState({ kind, onAdd }: { kind: EmptyKind; onAdd: () => void }) {
  const { icon, title, subtitle, showCta } = EMPTY_CONFIGS[kind];
  return (
    <EmptyState
      icon={icon}
      title={title}
      subtitle={subtitle}
      cta={showCta ? { label: "Planter une graine", onClick: onAdd } : undefined}
    />
  );
}
