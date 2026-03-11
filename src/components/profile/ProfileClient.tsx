"use client";

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Profile, ProfileStats } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/contexts/ToastContext";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

// ── Accent palette ────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { value: "#D4E600", label: "Jaune (défaut)" },
  { value: "#00C9A7", label: "Vert menthe" },
  { value: "#FF6B6B", label: "Corail" },
  { value: "#4ECDC4", label: "Turquoise" },
  { value: "#A29BFE", label: "Lavande" },
  { value: "#FFA94D", label: "Mandarine" },
];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 first:pt-0">
      <h2 className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 uppercase tracking-[0.15em] mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="h-px bg-garden-border dark:bg-white/10" />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-4 bg-white dark:bg-white/5 border border-garden-border dark:border-white/10 rounded-card">
      <span className="text-xl">{icon}</span>
      <p className="font-mono text-display-sm font-bold text-garden-black dark:text-white leading-none">
        {value}
      </p>
      <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-garden-yellow ${
        checked ? "bg-garden-green" : "bg-garden-border dark:bg-white/20"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface ProfileClientProps {
  user: User;
  profile: Profile;
  stats: ProfileStats;
}

export function ProfileClient({ user, profile, stats }: ProfileClientProps) {
  const toast = useToast();
  const router = useRouter();
  const { setProfile } = useDashboard();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Section 1: Informations personnelles ──────────────────────────────────
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [language, setLanguage] = useState<"fr" | "en">(profile.language ?? "fr");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Section 2: Sécurité ────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Section 3: Apparence ──────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [accent, setAccent] = useState(ACCENT_COLORS[0].value);
  const [defaultView, setDefaultView] = useState<"grid" | "list">("grid");

  // Load appearance from localStorage on mount
  useEffect(() => {
    const theme = localStorage.getItem("garden:theme");
    setDarkMode(theme === "dark");
    const savedAccent = localStorage.getItem("garden:accent");
    if (savedAccent) setAccent(savedAccent);
    const savedView = localStorage.getItem("garden:defaultView") as "grid" | "list" | null;
    if (savedView) setDefaultView(savedView);
  }, []);

  // Apply dark mode class to <html> when toggle changes
  const handleDarkMode = (on: boolean) => {
    setDarkMode(on);
    if (on) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("garden:theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("garden:theme", "light");
    }
  };

  // Apply accent color via CSS custom property
  const handleAccent = (color: string) => {
    setAccent(color);
    localStorage.setItem("garden:accent", color);
    // Inject / update a <style> with the override
    const styleId = "garden-accent-override";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `
      :root { --garden-accent: ${color}; }
      .btn-primary { background-color: ${color} !important; }
      .btn-primary:hover { background-color: ${color}cc !important; }
    `;
  };

  const handleDefaultView = (view: "grid" | "list") => {
    setDefaultView(view);
    localStorage.setItem("garden:defaultView", view);
    toast.success(`Vue par défaut : ${view === "grid" ? "Grille" : "Liste"}`);
  };

  // ── Section 5: Zone de danger ─────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Format non accepté. Utilise JPG, PNG, GIF ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop lourde (max 2 MB)");
      return;
    }

    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("[Profile] Avatar upload error:", uploadError.message);
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the browser doesn't show the old avatar
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? "", avatar_url: publicUrl });

      if (updateError) {
        console.error("[Profile] Avatar DB update error:", updateError.message);
        // File uploaded successfully even if DB update failed — show partial success
        toast.error("Photo uploadée mais non sauvegardée en base. Réessaie.");
        setAvatarUrl(publicUrl); // still show it locally
        return;
      }

      setAvatarUrl(publicUrl);
      // Sync context so Sidebar updates immediately without reload
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[Profile] Avatar error:", msg);
      toast.error(`Erreur lors de l'upload : ${msg}`);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Save personal info ────────────────────────────────────────────────────
  const handleSaveInfo = async (e: FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const supabase = createClient();
      // Use upsert so it works even if the profile row doesn't exist yet
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        language,
      });

      if (error) {
        console.error("[Profile] Save error:", error.message, error.details);
        throw error;
      }
      // Sync context so Sidebar updates immediately without reload
      setProfile({
        ...profile,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        language,
        avatar_url: avatarUrl,
      });
      toast.success("Profil mis à jour");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[Profile] Save failed:", msg);
      toast.error(`Erreur lors de la sauvegarde : ${msg}`);
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Save password ─────────────────────────────────────────────────────────
  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteInput !== "SUPPRIMER") return;
    setDeleting(true);
    try {
      const supabase = createClient();
      // Delete user data (RLS must allow user to delete their own rows)
      await supabase.from("inspirations").delete().eq("user_id", user.id);
      await supabase.from("gardens").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
    }
  };

  const initials = (fullName || user.email)?.charAt(0).toUpperCase() ?? "G";

  return (
    <div className="max-w-xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-10 flex items-center gap-4">
        {/* Avatar large */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full bg-garden-green overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Photo de profil"
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <span className="text-white font-bold text-2xl">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-garden-yellow flex items-center justify-center text-garden-black text-xs hover:bg-garden-yellow-dim transition-colors shadow-sm disabled:opacity-60"
            title="Changer la photo"
          >
            {avatarUploading ? "…" : "✎"}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div>
          <h1 className="text-display-sm font-bold text-garden-black dark:text-white mb-0.5">
            {fullName || "Mon profil"}
          </h1>
          <p className="font-mono text-xs text-garden-text-muted dark:text-white/40">
            {user.email}
          </p>
        </div>
      </div>

      {/* ── 1. Informations personnelles ────────────────────────── */}
      <Section title="Informations personnelles">
        <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Nom d'affichage
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ton prénom ou pseudonyme"
              className="input-base dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-garden-yellow"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              className="input-base opacity-60 cursor-not-allowed dark:bg-white/5 dark:border-white/10 dark:text-white/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Bio / intention{" "}
              <span className="normal-case tracking-normal">(optionnel, max 140 car.)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 140))}
              placeholder="Pourquoi cultives-tu ce jardin ?"
              rows={2}
              className="input-base resize-none dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
            />
            <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/30 text-right">
              {bio.length} / 140
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Langue
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
                className="input-base appearance-none cursor-pointer pr-9 dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="en">🇬🇧 English</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-garden-text-muted pointer-events-none text-xs">▾</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingInfo}
            className="btn-primary self-start disabled:opacity-60"
          >
            {savingInfo ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </form>
      </Section>

      <Divider />

      {/* ── 2. Sécurité ─────────────────────────────────────────── */}
      <Section title="Sécurité">
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="input-base dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-garden-text-muted dark:text-white/50 uppercase tracking-wide">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="input-base dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-500 font-mono">{passwordError}</p>
          )}

          <button
            type="submit"
            disabled={savingPassword || !newPassword}
            className="btn-primary self-start disabled:opacity-60"
          >
            {savingPassword ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </Section>

      <Divider />

      {/* ── 3. Apparence ────────────────────────────────────────── */}
      <Section title="Apparence">
        <div className="flex flex-col gap-6">
          {/* Dark mode */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans font-medium text-garden-black dark:text-white text-sm">
                Mode sombre
              </p>
              <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 mt-0.5">
                Fond #0A0A0A, texte clair
              </p>
            </div>
            <Toggle checked={darkMode} onChange={handleDarkMode} label="Mode sombre" />
          </div>

          {/* Accent color */}
          <div className="flex flex-col gap-3">
            <p className="font-sans font-medium text-garden-black dark:text-white text-sm">
              Couleur d'accent
            </p>
            <div className="flex gap-2.5 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => handleAccent(c.value)}
                  className={`w-8 h-8 rounded-full transition-all duration-150 hover:scale-110 ${
                    accent === c.value
                      ? "ring-2 ring-offset-2 ring-garden-black dark:ring-white ring-offset-white dark:ring-offset-[#0A0A0A] scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Default view */}
          <div className="flex flex-col gap-3">
            <p className="font-sans font-medium text-garden-black dark:text-white text-sm">
              Vue par défaut du dashboard
            </p>
            <div className="flex gap-2">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleDefaultView(v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-card border font-mono text-xs transition-all duration-150 ${
                    defaultView === v
                      ? "bg-garden-green text-white border-garden-green"
                      : "bg-white dark:bg-white/5 text-garden-text-muted dark:text-white/50 border-garden-border dark:border-white/10 hover:border-garden-green hover:text-garden-green"
                  }`}
                >
                  <span>{v === "grid" ? "⊞" : "☰"}</span>
                  {v === "grid" ? "Grille" : "Liste"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 4. Chiffres ─────────────────────────────────────────── */}
      <Section title="Mon jardin en chiffres">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            icon="🌱"
            value={stats.total}
            label="Inspirations cultivées"
          />
          <StatCard
            icon="⭐"
            value={stats.favorites}
            label="Favoris"
          />
          <StatCard
            icon="🏷️"
            value={stats.topTag ? `#${stats.topTag}` : "—"}
            label="Tag le plus utilisé"
          />
          <StatCard
            icon="🌿"
            value={stats.topGarden ?? "—"}
            label="Jardin le plus actif"
          />
          <StatCard
            icon="📅"
            value={
              stats.firstSeed ? formatDate(stats.firstSeed) : "—"
            }
            label="Première graine plantée"
          />
        </div>
      </Section>

      <Divider />

      {/* ── 5. Zone de danger ───────────────────────────────────── */}
      <Section title="Zone de danger">
        {!showDeleteConfirm ? (
          <div className="flex flex-col gap-3">
            <p className="font-sans font-extralight text-garden-text-muted dark:text-white/50 text-sm leading-relaxed">
              Supprime définitivement ton compte et toutes tes inspirations.
              Cette action est irréversible.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="self-start font-mono text-sm text-red-500/70 hover:text-red-600 border border-red-200/60 hover:border-red-400 px-4 py-2 rounded-card transition-all duration-150"
            >
              Supprimer mon compte
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-card animate-fade-in">
            <p className="font-sans font-medium text-red-700 dark:text-red-400 text-sm">
              ⚠️ Cette action supprimera toutes tes données et ne peut pas être annulée.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">
                Tape <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="SUPPRIMER"
                className="input-base border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-red-200/30 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "SUPPRIMER" || deleting}
                className="flex-1 py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-sans font-bold rounded-card transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Bottom padding for breathing room */}
      <div className="h-16" />
    </div>
  );
}
