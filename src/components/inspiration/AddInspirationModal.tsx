"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import Image from "next/image";
import type { Inspiration, InspirationKind } from "@/lib/types";
import type { OGPreview } from "@/app/api/og-preview/route";
import { createClient } from "@/lib/supabase/client";
import { TagInput } from "@/components/ui/TagInput";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { detectType, getYouTubeThumbnail, extractDomain, suggestTagsFromOG } from "@/lib/utils";
import { useDashboard } from "@/lib/contexts/DashboardContext";

// ── Upload to Supabase Storage via XHR (for progress tracking) ───────────────

async function uploadToStorage(
  file: File,
  userId: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Non authentifié");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const randomId = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/${Date.now()}-${randomId}.${ext}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const endpoint = `${supabaseUrl}/storage/v1/object/inspirations/${path}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/inspirations/${path}`;
        resolve(publicUrl);
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string; message?: string };
          reject(new Error(body.error ?? body.message ?? `Upload échoué (${xhr.status})`));
        } catch {
          reject(new Error(`Upload échoué (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload."));
    xhr.send(file);
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: InspirationKind; label: string; icon: string }[] = [
  { value: "link", label: "Lien", icon: "⌁" },
  { value: "image", label: "Image", icon: "◈" },
  { value: "text", label: "Texte", icon: "❝" },
  { value: "video", label: "Vidéo", icon: "▷" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AddInspirationModalProps {
  onClose: () => void;
  onAdd: (inspiration: Inspiration) => void;
  defaultGardenId?: string | null;
  existingTags?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddInspirationModal({ onClose, onAdd, defaultGardenId, existingTags = [] }: AddInspirationModalProps) {
  // ── Core state
  const [type, setType] = useState<InspirationKind>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Garden assignment
  const { gardens } = useDashboard();
  const [gardenId, setGardenId] = useState<string | null>(defaultGardenId ?? null);

  // ── Source mode (image / video only)
  const [sourceMode, setSourceMode] = useState<"url" | "file">("url");

  // ── File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── OG preview state (link only)
  const [ogPreview, setOgPreview] = useState<OGPreview | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const lastFetchedUrl = useRef<string>("");

  // ── Tag suggestions derived from OG data (link only)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // ── Reset file/source when type changes ──────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSourceMode("url");
    // clearFile is stable (defined below with useCallback) but ESLint can't see that here
    // We call the same cleanup logic inline to avoid the dependency warning
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setSelectedFile(null);
    setUploadProgress(0);
    setOgPreview(null);
    setSuggestedTags([]);
    lastFetchedUrl.current = "";
  // We only want this to fire when type changes, not when clearFile identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // ── Compute tag suggestions when OG preview arrives ──────────
  useEffect(() => {
    if (!ogPreview) { setSuggestedTags([]); return; }
    // Pass `tags` at the moment OG loads to exclude already-added tags.
    // We intentionally omit `tags` from deps so suggestions don't disappear
    // as the user adds them — we show them grayed-out instead.
    setSuggestedTags(suggestTagsFromOG(ogPreview, tags));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogPreview]);

  // ── Cleanup blob URL on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, []);

  // ── Auto-detect type from URL (URL mode only) ────────────────
  useEffect(() => {
    if (url && sourceMode === "url") {
      setType(detectType(url));
    }
  }, [url, sourceMode]);

  // ── ESC to close ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── File helpers ──────────────────────────────────────────────
  const clearFile = useCallback(() => {
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setSelectedFile(null);
    setUploadProgress(0);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      clearFile();
      setSelectedFile(file);
      if (type === "image") {
        setImagePreview(URL.createObjectURL(file));
      }
    },
    [clearFile, type]
  );

  const switchSourceMode = (mode: "url" | "file") => {
    setSourceMode(mode);
    clearFile();
    setUrl("");
    setOgPreview(null);
    lastFetchedUrl.current = "";
  };

  // ── OG preview ────────────────────────────────────────────────
  const fetchOGPreview = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === lastFetchedUrl.current) return;
    if (detectType(trimmed) !== "link") return;

    try {
      const valid = new URL(trimmed);
      if (!["http:", "https:"].includes(valid.protocol)) return;
    } catch {
      return;
    }

    lastFetchedUrl.current = trimmed;
    setOgLoading(true);
    setOgPreview(null);

    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("API error");
      const data: OGPreview = await res.json();
      setOgPreview(data);
      if (!title.trim() && data.title) setTitle(data.title);
    } catch {
      // Best-effort — silently fail
    } finally {
      setOgLoading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const isText = type === "text";
    const isFileMode = (type === "image" || type === "video") && sourceMode === "file";

    // Validation
    if (isText && !text.trim()) { setError("Écris quelque chose."); return; }
    if (!isText && !isFileMode && !url.trim()) { setError("Ajoute une URL."); return; }
    if (isFileMode && !selectedFile) { setError("Sélectionne un fichier."); return; }

    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // ── Resolve content_url + thumbnail_url
    let contentUrl: string = "";
    let thumbnailUrl: string | null = null;

    try {
      if (isFileMode && selectedFile) {
        setUploadProgress(0);
        contentUrl = await uploadToStorage(selectedFile, user.id, (p) => setUploadProgress(p));
        if (type === "image") thumbnailUrl = contentUrl;
      } else if (isText) {
        contentUrl = text.trim();
      } else {
        contentUrl = url.trim();
        if (type === "video") thumbnailUrl = getYouTubeThumbnail(url);
        else if (type === "link" && ogPreview?.image) thumbnailUrl = ogPreview.image;
      }
    } catch (uploadErr: unknown) {
      setError(uploadErr instanceof Error ? uploadErr.message : "Erreur lors de l'upload.");
      setLoading(false);
      return;
    }

    // ── Insert into DB
    const payload = {
      user_id: user.id,
      type,
      title: title.trim() || null,
      content_url: contentUrl || null,
      source_url: isText || isFileMode ? null : url.trim() || null,
      thumbnail_url: thumbnailUrl,
      notes: notes.trim() || null,
      tags,
      is_favorite: false,
      garden_id: gardenId,
    };

    const { data, error: insertError } = await supabase
      .from("inspirations")
      .insert(payload)
      .select()
      .single();

    setLoading(false);
    if (insertError) { setError("Erreur lors de l'enregistrement. Réessaie."); return; }

    onAdd(data as Inspiration);
  };

  // ── Derived flags ─────────────────────────────────────────────
  const supportsFileUpload = type === "image" || type === "video";
  const isUploading = loading && uploadProgress > 0 && uploadProgress < 100;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="false"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter une inspiration"
        className="relative w-full max-w-lg animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-gray-900 rounded-card border border-garden-border dark:border-white/10 shadow-modal overflow-hidden flex flex-col">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-garden-border dark:border-white/10 shrink-0">
            <h2 className="font-sans font-bold text-garden-black dark:text-white text-base">Planter une graine</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-card hover:bg-garden-green-muted dark:hover:bg-white/5 text-garden-text-muted dark:text-white/50 hover:text-garden-black dark:hover:text-white transition-all duration-200"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          {/* ── Scrollable body ─────────────────────────────────── */}
          <div className="overflow-y-auto">

            {/* Type selector */}
            <div className="px-6 pt-4 flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setType(opt.value);
                    setOgPreview(null);
                    lastFetchedUrl.current = "";
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-card border text-xs font-mono transition-all duration-200
                    ${
                      type === opt.value
                        ? "bg-garden-green text-white border-garden-green"
                        : "bg-white dark:bg-white/5 text-garden-text-muted dark:text-white/50 border-garden-border dark:border-white/10 hover:border-garden-green hover:text-garden-green"
                    }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form
              id="add-inspiration-form"
              onSubmit={handleSubmit}
              className="px-6 py-4 flex flex-col gap-4"
            >

              {/* ── TEXT ───────────────────────────────────────── */}
              {type === "text" && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    Texte
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Citation, extrait, fragment de pensée…"
                    rows={5}
                    className="input-base resize-none"
                    autoFocus
                  />
                </div>
              )}

              {/* ── LINK ───────────────────────────────────────── */}
              {type === "link" && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    URL du lien
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onBlur={(e) => fetchOGPreview(e.target.value)}
                      placeholder="https://exemple.com/article"
                      className="input-base pr-8"
                      autoFocus
                    />
                    {ogLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-garden-text-muted dark:text-white/30 animate-pulse">
                        …
                      </span>
                    )}
                  </div>
                  {ogPreview && (
                    <div className="mt-1 flex gap-3 items-start bg-garden-green-light dark:bg-white/5 border border-garden-border dark:border-white/10 rounded-card p-3 animate-fade-in">
                      {ogPreview.image && (
                        <div className="relative shrink-0 w-16 h-12 rounded overflow-hidden bg-garden-green-muted dark:bg-white/10">
                          <Image
                            src={ogPreview.image}
                            alt={ogPreview.title ?? ""}
                            fill
                            className="object-cover"
                            sizes="64px"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {ogPreview.title && (
                          <p className="font-sans font-bold text-garden-black dark:text-white text-xs leading-snug truncate">
                            {ogPreview.title}
                          </p>
                        )}
                        {ogPreview.description && (
                          <p className="font-sans font-extralight text-garden-text-muted dark:text-white/40 text-[11px] leading-snug mt-0.5 line-clamp-2">
                            {ogPreview.description}
                          </p>
                        )}
                        <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 mt-1">
                          {ogPreview.siteName ?? extractDomain(ogPreview.url)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── IMAGE / VIDEO — toggle URL ↔ File ──────────── */}
              {supportsFileUpload && (
                <div className="flex flex-col gap-2.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    {type === "image" ? "Image" : "Vidéo"}
                  </label>

                  {/* Source toggle */}
                  <div className="flex gap-1 p-1 bg-garden-green-muted dark:bg-white/5 rounded-card">
                    {(["url", "file"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => switchSourceMode(mode)}
                        className={`
                          flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-xs transition-all duration-150
                          ${
                            sourceMode === mode
                              ? "bg-white dark:bg-white/15 text-garden-black dark:text-white shadow-sm"
                              : "text-garden-text-muted dark:text-white/40 hover:text-garden-black dark:hover:text-white"
                          }
                        `}
                      >
                        <span>{mode === "url" ? "⌁" : "⬆"}</span>
                        {mode === "url" ? "Depuis une URL" : "Depuis mes fichiers"}
                      </button>
                    ))}
                  </div>

                  {/* URL input */}
                  {sourceMode === "url" && (
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={
                        type === "image"
                          ? "https://exemple.com/image.jpg"
                          : "https://youtube.com/watch?v=…"
                      }
                      className="input-base"
                      autoFocus
                    />
                  )}

                  {/* File upload zone */}
                  {sourceMode === "file" && (
                    <FileUploadZone
                      type={type as "image" | "video"}
                      file={selectedFile}
                      imagePreview={imagePreview}
                      onFile={handleFileSelect}
                      onClear={clearFile}
                    />
                  )}
                </div>
              )}

              {/* ── Upload progress bar ────────────────────────── */}
              {isUploading && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40">
                      Upload en cours…
                    </span>
                    <span className="font-mono text-[10px] text-garden-green font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-garden-green-muted dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-garden-green rounded-full transition-all duration-100 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── Title ──────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                  Titre{" "}
                  <span className="normal-case tracking-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Donne un nom à cette graine…"
                  className="input-base"
                />
              </div>

              {/* ── Notes ──────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                  Note personnelle{" "}
                  <span className="normal-case tracking-normal">(optionnel)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pourquoi ça t'inspire ? Comment tu veux l'utiliser ?"
                  rows={2}
                  className="input-base resize-none"
                />
              </div>

              {/* ── Tags ───────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                  Tags{" "}
                  <span className="normal-case tracking-normal">(optionnel)</span>
                </label>
                <TagInput tags={tags} onChange={setTags} existingTags={existingTags} />
                <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/30">
                  Entrée, virgule ou espace pour valider chaque tag
                </p>

                {/* ── OG tag suggestions ─────────────────────────── */}
                {suggestedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 shrink-0">
                      Suggestions :
                    </span>
                    {suggestedTags.map((tag) => {
                      const isAdded = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!isAdded) setTags((prev) => [...prev, tag]);
                          }}
                          disabled={isAdded}
                          title={isAdded ? "Déjà ajouté" : `Ajouter #${tag}`}
                          className={`
                            font-mono text-[11px] px-2 py-0.5 rounded-tag border
                            transition-all duration-150 select-none
                            ${
                              isAdded
                                ? "border-garden-border text-garden-text-muted opacity-40 cursor-default"
                                : "border-dashed border-garden-green text-garden-green bg-transparent hover:bg-garden-green hover:text-white cursor-pointer"
                            }
                          `}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Garden picker ──────────────────────────────── */}
              {gardens.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
                    Jardin{" "}
                    <span className="normal-case tracking-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={gardenId ?? ""}
                      onChange={(e) => setGardenId(e.target.value || null)}
                      className="input-base w-full appearance-none cursor-pointer pr-9"
                    >
                      <option value="">Aucun jardin</option>
                      {gardens.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-garden-text-muted dark:text-white/40 pointer-events-none text-xs">
                      ▾
                    </span>
                  </div>
                </div>
              )}

              {/* ── Error ──────────────────────────────────────── */}
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-card px-3 py-2 font-mono">
                  {error}
                </p>
              )}
            </form>
          </div>

          {/* ── Footer actions ──────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-garden-border dark:border-white/10 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="add-inspiration-form"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? isUploading
                  ? `Upload ${uploadProgress}%`
                  : "Plantation…"
                : "Planter ✦"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
