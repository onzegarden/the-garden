"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { Inspiration, InspirationKind } from "@/lib/types";
import { InspirationDetail } from "@/components/inspiration/InspirationDetail";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/contexts/ToastContext";

// ── Date helpers ───────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  // Monday-based week
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(d);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
}

// ── Grouping ───────────────────────────────────────────────────────────────────

interface GroupedPeriod {
  label: string;
  items: Inspiration[];
}

const NAMED_PERIODS = ["Aujourd'hui", "Cette semaine", "Ce mois-ci"];

function groupByPeriod(inspirations: Inspiration[]): GroupedPeriod[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const groups = new Map<string, Inspiration[]>();

  for (const insp of inspirations) {
    const date = new Date(insp.created_at);
    let key: string;

    if (date >= todayStart) {
      key = "Aujourd'hui";
    } else if (date >= weekStart) {
      key = "Cette semaine";
    } else if (date >= monthStart) {
      key = "Ce mois-ci";
    } else {
      key = formatMonthYear(date);
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(insp);
  }

  // Named periods first (in order), then monthly groups in insertion order (already desc)
  const result: GroupedPeriod[] = [];
  for (const label of NAMED_PERIODS) {
    if (groups.has(label)) {
      result.push({ label, items: groups.get(label)! });
    }
  }
  Array.from(groups.entries()).forEach(([label, items]) => {
    if (!NAMED_PERIODS.includes(label)) {
      result.push({ label, items });
    }
  });

  return result;
}

// ── Type filter config ─────────────────────────────────────────────────────────

const TYPE_FILTERS: Array<{ value: InspirationKind | "all"; label: string; icon: string }> = [
  { value: "all",   label: "Tous",   icon: "◉" },
  { value: "image", label: "Image",  icon: "◈" },
  { value: "link",  label: "Lien",   icon: "⌁" },
  { value: "text",  label: "Texte",  icon: "❝" },
  { value: "video", label: "Vidéo",  icon: "▷" },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface JournalClientProps {
  initialInspirations: Inspiration[];
}

export function JournalClient({ initialInspirations }: JournalClientProps) {
  const [inspirations, setInspirations] = useState<Inspiration[]>(initialInspirations);
  const [typeFilter, setTypeFilter] = useState<InspirationKind | "all">("all");
  const [gardenFilter, setGardenFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { gardens } = useDashboard();
  const toast = useToast();

  // ── Filtered + grouped ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let items = inspirations.filter((i) => !i.is_archived);
    if (typeFilter !== "all") items = items.filter((i) => i.type === typeFilter);
    if (gardenFilter) items = items.filter((i) => i.garden_id === gardenFilter);
    return items;
  }, [inspirations, typeFilter, gardenFilter]);

  const groups = useMemo(() => groupByPeriod(filtered), [filtered]);

  const gardenMap = useMemo(
    () => new Map(gardens.map((g) => [g.id, g.name])),
    [gardens]
  );

  const selectedInspiration = useMemo(
    () => (selectedId ? inspirations.find((i) => i.id === selectedId) ?? null : null),
    [selectedId, inspirations]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    inspirations.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [inspirations]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpdate = useCallback((updated: Inspiration) => {
    setInspirations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("inspirations").delete().eq("id", id);
      if (error) {
        toast.error("Impossible de supprimer l'inspiration");
        return;
      }
      setInspirations((prev) => prev.filter((i) => i.id !== id));
      setSelectedId(null);
      toast.success("Inspiration supprimée");
    },
    [toast]
  );

  const handleFavorite = useCallback(
    async (id: string, val: boolean) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inspirations")
        .update({ is_favorite: val })
        .eq("id", id)
        .select()
        .single();
      if (data) {
        setInspirations((prev) =>
          prev.map((i) => (i.id === id ? (data as Inspiration) : i))
        );
      } else if (error) {
        toast.error("Impossible de mettre à jour le favori");
      }
    },
    [toast]
  );

  // ── Empty state (no inspirations at all) ──────────────────────────────────

  const totalNonArchived = useMemo(
    () => inspirations.filter((i) => !i.is_archived).length,
    [inspirations]
  );

  if (totalNonArchived === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <span className="text-5xl mb-5 opacity-50">🌱</span>
        <p className="font-sans text-base font-light text-garden-text-muted dark:text-gray-400 leading-relaxed max-w-xs">
          Ton jardin n&apos;a pas encore de mémoire.
          <br />
          <span className="italic">Plante ta première graine.</span>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-garden-black dark:text-white mb-1">
            Journal
          </h1>
          <p className="font-mono text-xs text-garden-text-muted dark:text-gray-400">
            {filtered.length} souvenir{filtered.length !== 1 ? "s" : ""} dans ton jardin
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          {/* Type pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`
                  inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded-tag border
                  transition-all duration-150
                  ${
                    typeFilter === f.value
                      ? "bg-garden-green text-white border-garden-green"
                      : "bg-transparent text-garden-text-muted dark:text-gray-400 border-garden-border dark:border-gray-600 hover:border-garden-green hover:text-garden-green dark:hover:text-white dark:hover:border-gray-400"
                  }
                `}
              >
                <span className="text-[9px]">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Garden select */}
          {gardens.length > 0 && (
            <div className="relative">
              <select
                value={gardenFilter ?? ""}
                onChange={(e) => setGardenFilter(e.target.value || null)}
                className="font-mono text-[10px] text-garden-black dark:text-white bg-white dark:bg-gray-800 border border-garden-border dark:border-gray-600 rounded-card px-2.5 py-1 pr-6 appearance-none cursor-pointer hover:border-garden-green focus:border-garden-green focus:outline-none focus:ring-1 focus:ring-garden-green/20 transition-colors"
              >
                <option value="">Tous les jardins</option>
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-garden-text-muted dark:text-white/40 pointer-events-none text-[9px]">
                ▾
              </span>
            </div>
          )}
        </div>

        {/* ── Empty filtered state ─────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-3xl mb-3 opacity-40">🔍</span>
            <p className="font-mono text-sm text-garden-text-muted dark:text-gray-400">
              Aucune inspiration ne correspond à ces filtres
            </p>
          </div>
        ) : (
          /* ── Timeline ───────────────────────────────────────────────────── */
          <div className="relative">
            {/* Continuous vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-garden-green/20 dark:bg-garden-green/15" />

            {groups.map((group) => (
              <div key={group.label} className="mb-10">

                {/* ── Period header ─────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-5">
                  {/* Diamond marker */}
                  <div className="relative z-10 shrink-0">
                    <div className="w-[11px] h-[11px] rounded-full bg-garden-green dark:bg-garden-yellow border-2 border-garden-surface dark:border-gray-950 shadow-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-garden-text-muted dark:text-gray-400 uppercase tracking-widest">
                      {group.label}
                    </span>
                    <span className="font-mono text-[9px] text-garden-text-muted/40 dark:text-gray-600">
                      · {group.items.length}
                    </span>
                  </div>
                </div>

                {/* ── Items ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-2.5">
                  {group.items.map((insp) => (
                    <JournalItem
                      key={insp.id}
                      inspiration={insp}
                      gardenName={insp.garden_id ? (gardenMap.get(insp.garden_id) ?? null) : null}
                      onClick={() => setSelectedId(insp.id)}
                      onFavorite={(val) => handleFavorite(insp.id, val)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      {selectedInspiration && (
        <InspirationDetail
          inspiration={selectedInspiration}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onFavorite={handleFavorite}
          existingTags={allTags}
        />
      )}
    </>
  );
}

// ── JournalItem ────────────────────────────────────────────────────────────────

interface JournalItemProps {
  inspiration: Inspiration;
  gardenName: string | null;
  onClick: () => void;
  onFavorite: (val: boolean) => void;
}

function JournalItem({ inspiration, gardenName, onClick, onFavorite }: JournalItemProps) {
  const { type, title, notes, tags, is_favorite, created_at, content_url, thumbnail_url } =
    inspiration;

  const previewUrl = thumbnail_url || (type === "image" ? content_url : null);
  const timeStr = formatTime(created_at);

  return (
    <div className="flex items-start gap-3 group/item">

      {/* Timeline dot */}
      <div className="relative z-10 shrink-0 mt-[18px]">
        <div
          className={`
            w-2.5 h-2.5 rounded-full border-2 border-garden-surface dark:border-gray-950
            shadow-sm transition-all duration-200
            ${
              is_favorite
                ? "bg-garden-yellow"
                : "bg-garden-green/40 group-hover/item:bg-garden-green dark:bg-garden-green/50 dark:group-hover/item:bg-garden-green"
            }
          `}
        />
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={onClick}
        className="
          flex-1 flex items-start gap-3 text-left
          bg-white dark:bg-gray-800 border border-garden-border dark:border-gray-700
          rounded-card p-3.5 shadow-card dark:shadow-none
          hover:shadow-card-hover dark:hover:bg-gray-700 hover:-translate-y-px
          transition-all duration-200 cursor-pointer
          focus-visible:outline-2 focus-visible:outline-garden-yellow focus-visible:outline-offset-2
        "
      >
        {/* Left: thumbnail or type icon */}
        <div className="shrink-0">
          {previewUrl ? (
            <div className="relative w-14 h-14 rounded overflow-hidden bg-garden-green-muted dark:bg-white/5">
              <Image
                src={previewUrl}
                alt={title ?? ""}
                fill
                className="object-cover"
                sizes="56px"
              />
              {type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-white text-xs">▷</span>
                </div>
              )}
            </div>
          ) : (
            <TypeIcon type={type} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Top row: badges + time */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <TypeBadge type={type} />
              {gardenName && (
                <span className="font-mono text-[9px] text-garden-text-muted/70 dark:text-gray-500 bg-garden-surface dark:bg-gray-700/60 px-1.5 py-0.5 rounded-full">
                  🌿 {gardenName}
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-garden-text-muted/60 dark:text-gray-500 shrink-0 mt-0.5">
              {timeStr}
            </span>
          </div>

          {/* Title */}
          {title && (
            <p className="font-sans font-semibold text-sm text-garden-black dark:text-white leading-snug mb-1 line-clamp-1">
              {title}
            </p>
          )}

          {/* Notes */}
          {notes && (
            <p className="font-sans font-extralight text-xs text-garden-text-muted dark:text-gray-400 leading-relaxed line-clamp-2 mb-1.5">
              {notes}
            </p>
          )}

          {/* Text excerpt (no title, no notes) */}
          {type === "text" && !title && !notes && content_url && (
            <p className="font-sans font-extralight text-xs text-garden-text-muted dark:text-gray-400 leading-relaxed line-clamp-2 mb-1.5 italic">
              {content_url.slice(0, 140)}…
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded-tag border border-garden-border dark:border-gray-600 text-garden-text-muted dark:text-gray-400 bg-garden-surface dark:bg-gray-700"
                >
                  #{tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="font-mono text-[9px] text-garden-text-muted/50 dark:text-gray-500">
                  +{tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Favorite star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(!is_favorite);
          }}
          className={`
            shrink-0 text-sm transition-all duration-200 hover:scale-110 mt-0.5
            ${is_favorite ? "opacity-100" : "opacity-20 hover:opacity-60"}
          `}
          aria-label={is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          ⭐
        </button>
      </button>
    </div>
  );
}

// ── TypeIcon — shown when no thumbnail available ───────────────────────────────

function TypeIcon({ type }: { type: InspirationKind }) {
  const config: Record<InspirationKind, { icon: string; bg: string; text: string }> = {
    image: { icon: "◈", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
    text:  { icon: "❝", bg: "bg-blue-50 dark:bg-blue-900/20",      text: "text-blue-600 dark:text-blue-400"    },
    link:  { icon: "⌁", bg: "bg-violet-50 dark:bg-violet-900/20",  text: "text-violet-600 dark:text-violet-400" },
    video: { icon: "▷", bg: "bg-orange-50 dark:bg-orange-900/20",  text: "text-orange-600 dark:text-orange-400" },
  };
  const { icon, bg, text } = config[type];
  return (
    <div
      className={`w-14 h-14 rounded flex items-center justify-center text-2xl ${bg} ${text}`}
    >
      {icon}
    </div>
  );
}
