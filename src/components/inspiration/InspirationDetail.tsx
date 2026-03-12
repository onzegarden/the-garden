"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Image from "next/image";
import type { Inspiration } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Tag } from "@/components/ui/Tag";
import { TagInput } from "@/components/ui/TagInput";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { formatDate, extractDomain, getYouTubeEmbedUrl } from "@/lib/utils";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { useToast } from "@/lib/contexts/ToastContext";

interface InspirationDetailProps {
  inspiration: Inspiration;
  onClose: () => void;
  onUpdate: (updated: Inspiration) => void;
  onDelete: (id: string) => void;
  onFavorite: (id: string, val: boolean) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string | null;
  existingTags?: string[];
}

export function InspirationDetail({
  inspiration,
  onClose,
  onUpdate,
  onDelete,
  onFavorite,
  onTagClick,
  activeTagFilter,
  existingTags = [],
}: InspirationDetailProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(inspiration.title ?? "");
  const [notes, setNotes] = useState(inspiration.notes ?? "");
  const [tags, setTags] = useState<string[]>(inspiration.tags);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Share state ────────────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const shareLinkRef = useRef<HTMLInputElement>(null);

  const toast = useToast();

  // ── Garden assignment ─────────────────────────────────────────
  const { gardens } = useDashboard();
  const [gardenId, setGardenId] = useState<string | null>(inspiration.garden_id);

  // Sync when the parent updates the inspiration (e.g. after an external change)
  useEffect(() => {
    setGardenId(inspiration.garden_id);
  }, [inspiration.garden_id]);

  const handleGardenChange = async (newGardenId: string | null) => {
    const prev = gardenId;
    setGardenId(newGardenId); // optimistic
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inspirations")
      .update({ garden_id: newGardenId })
      .eq("id", inspiration.id)
      .select()
      .single();
    if (data) {
      onUpdate(data as Inspiration);
      toast.success("Jardin mis à jour");
    } else {
      setGardenId(prev); // revert on failure
      if (error) toast.error("Impossible de changer de jardin");
    }
  };

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editing, onClose]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("inspirations")
      .update({
        title: title.trim() || null,
        notes: notes.trim() || null,
        tags,
      })
      .eq("id", inspiration.id)
      .select()
      .single();
    setSaving(false);
    if (data) {
      onUpdate(data as Inspiration);
      setEditing(false);
      toast.success("Modifications sauvegardées");
    }
  };

  const handleDelete = async () => {
    onDelete(inspiration.id);
  };

  const shareUrl = inspiration.share_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${inspiration.share_token}`
    : null;

  const handleShare = async () => {
    if (inspiration.is_shared && inspiration.share_token) {
      setShareOpen(true);
      return;
    }
    setShareLoading(true);
    const supabase = createClient();
    // Generate a random token server-side via a DB function, or generate it client-side
    const token = crypto.randomUUID().replace(/-/g, "");
    const { data, error } = await supabase
      .from("inspirations")
      .update({ is_shared: true, share_token: token })
      .eq("id", inspiration.id)
      .select()
      .single();
    setShareLoading(false);
    if (data) {
      onUpdate(data as Inspiration);
      setShareOpen(true);
    } else if (error) {
      toast.error("Impossible d'activer le partage");
    }
  };

  const handleDisableShare = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inspirations")
      .update({ is_shared: false })
      .eq("id", inspiration.id)
      .select()
      .single();
    if (data) {
      onUpdate(data as Inspiration);
      setShareOpen(false);
      toast.success("Partage désactivé");
    } else if (error) {
      toast.error("Impossible de désactiver le partage");
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleArchive = async () => {
    const newVal = !inspiration.is_archived;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inspirations")
      .update({ is_archived: newVal })
      .eq("id", inspiration.id)
      .select()
      .single();
    if (data) {
      onUpdate(data as Inspiration);
      toast.success(newVal ? "Inspiration archivée" : "Inspiration désarchivée");
      onClose(); // Item moves out of current view; close the panel
    } else if (error) {
      toast.error("Impossible d'archiver l'inspiration");
    }
  };

  const youtubeEmbed =
    inspiration.type === "video" && inspiration.content_url
      ? getYouTubeEmbedUrl(inspiration.content_url)
      : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides in from right on md+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={inspiration.title ?? "Détail de l'inspiration"}
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-gray-900 border-l border-garden-border dark:border-white/10 z-50 flex flex-col overflow-hidden animate-slide-in shadow-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-garden-border dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <TypeBadge type={inspiration.type} />
            {inspiration.source_url && (
              <a
                href={inspiration.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-garden-text-muted dark:text-white/50 hover:text-garden-green dark:hover:text-white transition-colors"
              >
                ↗ {extractDomain(inspiration.source_url)}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-card hover:bg-garden-green-muted dark:hover:bg-white/5 text-garden-text-muted dark:text-white/50 hover:text-garden-black dark:hover:text-white transition-all duration-200 text-xl"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Media preview */}
          {inspiration.type === "image" && inspiration.content_url && (
            <div className="relative w-full aspect-video bg-garden-green-muted dark:bg-black">
              <Image
                src={inspiration.content_url}
                alt={inspiration.title ?? ""}
                fill
                className="object-contain"
                sizes="480px"
              />
            </div>
          )}

          {youtubeEmbed && (
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={youtubeEmbed}
                title={inspiration.title ?? "Vidéo"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}

          {inspiration.type === "text" && inspiration.content_url && (
            <div className="px-6 pt-6 pb-2">
              <blockquote className="border-l-2 border-garden-yellow pl-4 font-sans font-extralight text-garden-black dark:text-white/80 text-base leading-relaxed italic">
                {inspiration.content_url}
              </blockquote>
            </div>
          )}

          {/* OG image banner — link type with thumbnail */}
          {inspiration.type === "link" && inspiration.thumbnail_url && (
            <div className="relative w-full h-52 bg-garden-green-muted dark:bg-white/5 overflow-hidden">
              <Image
                src={inspiration.thumbnail_url}
                alt={inspiration.title ?? "Aperçu du lien"}
                fill
                className="object-cover"
                sizes="480px"
              />
              {/* Bottom gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
              {/* Domain badge */}
              {inspiration.source_url && (
                <div className="absolute bottom-3 left-4">
                  <span className="font-mono text-[10px] text-white/90 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                    {extractDomain(inspiration.source_url)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-6">
            {editing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-base"
                    placeholder="Titre de l'inspiration"
                    autoFocus
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    Note
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-base resize-none"
                    rows={4}
                    placeholder="Tes pensées sur cette inspiration…"
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    Tags
                  </label>
                  <TagInput tags={tags} onChange={setTags} existingTags={existingTags} />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 disabled:opacity-60"
                  >
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Title */}
                {inspiration.title && (
                  <h2 className="font-sans font-bold text-garden-black dark:text-white text-display-sm leading-snug mb-3">
                    {inspiration.title}
                  </h2>
                )}

                {/* Notes */}
                {inspiration.notes && (
                  <p className="font-sans font-extralight text-garden-text-muted dark:text-white/50 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                    {inspiration.notes}
                  </p>
                )}

                {/* Tags */}
                {inspiration.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {inspiration.tags.map((tag) => (
                      <Tag
                        key={tag}
                        label={tag}
                        active={activeTagFilter === tag}
                        onClick={onTagClick ? () => onTagClick(tag) : undefined}
                      />
                    ))}
                  </div>
                )}

                {/* Source CTA — link type */}
                {inspiration.type === "link" &&
                  (inspiration.source_url || inspiration.content_url) && (
                    <a
                      href={inspiration.source_url ?? inspiration.content_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2.5 font-sans font-medium text-sm text-white bg-garden-green rounded-card px-5 py-2.5 hover:bg-garden-green-dim active:scale-[0.98] transition-all duration-200 mb-4"
                    >
                      Voir la source
                      <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5">
                        →
                      </span>
                    </a>
                  )}

                {/* Metadata */}
                <div className="border-t border-garden-border dark:border-white/10 pt-4 mt-2 flex flex-col gap-3">

                  {/* Garden picker */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 uppercase tracking-widest shrink-0">
                      Jardin
                    </span>
                    <div className="relative">
                      <select
                        value={gardenId ?? ""}
                        onChange={(e) => handleGardenChange(e.target.value || null)}
                        className="font-mono text-[11px] text-garden-black dark:text-white bg-white dark:bg-white/5 border border-garden-border dark:border-white/10 rounded-card px-2.5 py-1 pr-6 appearance-none cursor-pointer hover:border-garden-green focus:border-garden-green focus:outline-none focus:ring-1 focus:ring-garden-green/20 transition-colors"
                      >
                        <option value="">Aucun jardin</option>
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
                  </div>

                  {/* Date */}
                  <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/40">
                    Planté le {formatDate(inspiration.created_at)}
                  </p>

                  {/* Share panel */}
                  {shareOpen && inspiration.share_token && (
                    <div className="mt-2 p-4 bg-garden-green-muted dark:bg-white/5 rounded-card animate-fade-in flex flex-col gap-3">
                      <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/50 uppercase tracking-widest">
                        Lien de partage
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          ref={shareLinkRef}
                          readOnly
                          value={shareUrl ?? ""}
                          className="input-base text-xs flex-1 select-all cursor-pointer"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={handleCopyLink}
                          className={`btn-primary shrink-0 text-xs transition-all ${copyDone ? "!bg-garden-yellow !text-garden-black" : ""}`}
                        >
                          {copyDone ? "Copié ✓" : "Copier"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-sans font-light text-[11px] text-garden-text-muted dark:text-white/40 leading-relaxed">
                          Cette graine est visible par toute personne ayant le lien.
                        </p>
                        <button
                          onClick={handleDisableShare}
                          className="font-mono text-[10px] text-red-400 hover:text-red-600 hover:underline shrink-0 ml-3 transition-colors"
                        >
                          Désactiver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {!editing && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-garden-border dark:border-white/10 flex items-center justify-between shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFavorite(inspiration.id, !inspiration.is_favorite)}
                className={`btn-ghost text-sm transition-all ${
                  inspiration.is_favorite ? "text-amber-500 hover:text-amber-600" : ""
                }`}
                title={inspiration.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                ⭐ {inspiration.is_favorite ? "Favori" : "Favoriser"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost text-sm"
              >
                ✎ Modifier
              </button>
              <button
                onClick={handleShare}
                disabled={shareLoading}
                className={`btn-ghost text-sm transition-all ${inspiration.is_shared ? "text-garden-green" : ""}`}
                title="Partager cette inspiration"
              >
                {shareLoading ? "…" : "🔗 Partager"}
              </button>
            </div>

            {/* Archive + Delete */}
            <div className="flex items-center gap-1">
              {/* Archive */}
              <button
                onClick={handleArchive}
                className={`btn-ghost text-sm ${
                  inspiration.is_archived
                    ? "text-garden-green hover:text-garden-green-dim"
                    : "text-garden-text-muted"
                }`}
                title={inspiration.is_archived ? "Désarchiver cette inspiration" : "Archiver cette inspiration"}
              >
                📦 {inspiration.is_archived ? "Désarchiver" : "Archiver"}
              </button>

              {/* Delete */}
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-red-500">Supprimer ?</span>
                  <button
                    onClick={handleDelete}
                    className="font-mono text-xs text-red-600 hover:underline"
                  >
                    Oui
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="font-mono text-xs text-garden-text-muted hover:underline"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost text-sm text-garden-text-muted hover:text-red-500"
                >
                  ✕ Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
