"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import type { User } from "@supabase/supabase-js";
import type { Garden } from "@/lib/types";
import { useDashboard } from "@/lib/contexts/DashboardContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

// ─── Small helpers ───────────────────────────────────────────────────────────

function SidebarTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      {/* Tooltip — only visible when collapsed */}
      <span
        className="
          pointer-events-none absolute left-full ml-3 z-50
          bg-garden-black text-white text-xs font-mono px-2 py-1 rounded-tag
          whitespace-nowrap opacity-0 translate-x-1
          group-hover/tip:opacity-100 group-hover/tip:translate-x-0
          transition-all duration-150
        "
      >
        {label}
      </span>
    </div>
  );
}

// ─── Nav item ────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, expanded, onClick, badge }: NavItemProps) {
  const base =
    "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-card transition-all duration-150 cursor-pointer select-none";
  const state = active
    ? "bg-white/10 text-white"
    : "text-white/60 hover:bg-white/5 hover:text-white";

  return (
    <SidebarTooltip label={label}>
      <button onClick={onClick} className={`${base} ${state}`}>
        {/* Active accent */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-garden-yellow rounded-r-full" />
        )}
        <span className="shrink-0 w-5 flex items-center justify-center text-lg leading-none">
          {icon}
        </span>
        {expanded && (
          <span className="font-sans text-sm font-normal truncate flex-1 text-left">
            {label}
          </span>
        )}
        {badge !== undefined && badge > 0 && expanded && (
          <span className="ml-auto font-mono text-[10px] bg-garden-yellow text-garden-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    </SidebarTooltip>
  );
}

// ─── Garden item (with inline rename) ────────────────────────────────────────

interface GardenItemProps {
  garden: Garden;
  active: boolean;
  expanded: boolean;
  autoEdit?: boolean;
  onAutoEditDone?: () => void;
  onClick: () => void;
  onRename: (id: string, name: string) => Promise<void>;
}

function GardenItem({
  garden,
  active,
  expanded,
  autoEdit,
  onAutoEditDone,
  onClick,
  onRename,
}: GardenItemProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(garden.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep value in sync when garden.name changes (e.g. after server update)
  useEffect(() => {
    if (!editing) setValue(garden.name);
  }, [garden.name, editing]);

  // Auto-start edit mode when a new garden is created
  useEffect(() => {
    if (autoEdit && expanded) {
      startEdit();
      onAutoEditDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit, expanded]);

  const startEdit = () => {
    setValue(garden.name);
    setEditing(true);
    // Focus + select after render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
  };

  const commitEdit = async () => {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed && trimmed !== garden.name) {
      await onRename(garden.id, trimmed);
    } else {
      setValue(garden.name);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setValue(garden.name);
      setEditing(false);
    }
  };

  const base =
    "relative flex items-center gap-2.5 w-full px-3 py-2 rounded-card transition-all duration-150 cursor-pointer select-none group/item";
  const state = active
    ? "bg-white/10 text-white"
    : "text-white/60 hover:bg-white/5 hover:text-white";

  return (
    <SidebarTooltip label={garden.name}>
      <div
        className={`${base} ${state}`}
        onClick={() => {
          if (!editing) onClick();
        }}
        onDoubleClick={(e) => {
          if (expanded && !editing) {
            e.preventDefault();
            startEdit();
          }
        }}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-garden-yellow rounded-r-full" />
        )}
        {/* Avatar: cover photo or emoji */}
        <span className="shrink-0 w-5 h-5 rounded-[4px] overflow-hidden flex items-center justify-center text-sm leading-none">
          {garden.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={garden.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            garden.emoji ?? "🌿"
          )}
        </span>
        {expanded && (
          <>
            {editing ? (
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/10 text-white text-sm font-sans rounded px-1.5 py-0.5 outline-none border border-garden-yellow/50 min-w-0"
              />
            ) : (
              <span className="flex-1 font-sans text-sm truncate min-w-0">
                {garden.name}
              </span>
            )}
          </>
        )}
      </div>
    </SidebarTooltip>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const {
    sidebarExpanded: expanded,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    activeView,
    setActiveView,
    selectedGardenId,
    setSelectedGardenId,
    gardens,
    addGarden,
    updateGarden,
    profile,
  } = useDashboard();

  // Close mobile sidebar on any nav action
  const closeOnMobile = useCallback(() => setMobileSidebarOpen(false), [setMobileSidebarOpen]);

  const router = useRouter();
  const pathname = usePathname();
  const isOnTagsPage = pathname.startsWith("/dashboard/tags");
  const isOnProfilePage = pathname.startsWith("/dashboard/profile");
  const isOnJournalPage = pathname.startsWith("/dashboard/journal");
  // True when we need router.push to land back on /dashboard
  const needsNav = isOnTagsPage || isOnProfilePage || isOnJournalPage;
  const toast = useToast();
  const [creatingGarden, setCreatingGarden] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ID of the garden that should auto-start rename (just created)
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);

  const email = user.email ?? "";
  const displayName = profile?.full_name || email;
  const initials = displayName.charAt(0).toUpperCase() || "G";

  // ── Garden CRUD ────────────────────────────────────────────
  const handleCreateGarden = async () => {
    if (creatingGarden) return;
    setCreatingGarden(true);
    setCreateError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("gardens")
      .insert({ user_id: user.id, name: "Nouveau jardin" })
      .select()
      .single();

    setCreatingGarden(false);

    if (data) {
      addGarden(data as Garden);
      setSelectedGardenId(data.id);
      setActiveView("all");
      // Trigger inline rename for the newly created garden
      setPendingRenameId(data.id);
      toast.success("Nouveau jardin créé 🌿");
    } else {
      console.error("[Garden] Create failed:", error?.message ?? error);
      setCreateError("Impossible de créer le jardin. Vérifie ta connexion.");
      toast.error("Impossible de créer le jardin");
    }
  };

  const handleRenameGarden = useCallback(
    async (id: string, name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("gardens")
        .update({ name })
        .eq("id", id)
        .select()
        .single();
      if (data) {
        updateGarden(data as Garden);
        toast.success("Jardin renommé");
      } else {
        console.error("[Garden] Rename failed:", error?.message ?? error);
        toast.error("Impossible de renommer le jardin");
      }
    },
    [updateGarden, toast]
  );

  // ── Logout ──────────────────────────────────────────────────
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // ── Width classes ────────────────────────────────────────────
  // Mobile: always full-width (240px). Desktop: follows expanded state.
  const W = expanded ? "md:w-[240px]" : "md:w-[60px]";

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-40 flex flex-col
        bg-garden-green dark:bg-gray-900 border-r border-white/10 dark:border-white/5
        w-[240px] ${W}
        transition-all duration-200 ease-in-out overflow-hidden
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}
    >
      {/* ── Header: toggle + logo ────────────────────────────── */}
      <div className="flex items-center px-3 py-4 shrink-0 min-h-[64px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Leaf mark */}
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/10 shrink-0">
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-garden-yellow" />
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 10C2 10 3 4 9 2C9 2 9 8 2 10Z" fill="white" opacity="0.9" />
              <path d="M9 2L2 10" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          {(expanded || mobileSidebarOpen) && (
            <span className="font-sans font-bold text-white text-sm tracking-tight truncate">
              The Garden
            </span>
          )}
        </div>

        {/* Mobile: close button (×). Desktop: expand/collapse (←/→). */}
        <button
          onClick={() => {
            if (mobileSidebarOpen) {
              setMobileSidebarOpen(false);
            } else {
              toggleSidebar();
            }
          }}
          className={`
            flex items-center justify-center w-11 h-11 rounded-card
            text-white/50 hover:text-white hover:bg-white/10
            transition-all duration-150 shrink-0 font-mono text-base
            ${!expanded && !mobileSidebarOpen ? "mx-auto" : "ml-auto"}
          `}
          aria-label={mobileSidebarOpen ? "Fermer le menu" : expanded ? "Réduire la sidebar" : "Ouvrir la sidebar"}
        >
          {mobileSidebarOpen ? "×" : expanded ? "←" : "→"}
        </button>
      </div>

      {/* ── Separator ────────────────────────────────────────── */}
      <div className="h-px bg-white/10 mx-3 mb-2 shrink-0" />

      {/* ── Scrollable nav body ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 flex flex-col gap-0.5 py-1">
        {/* Main nav */}
        <NavItem
          icon="🏠"
          label="Mon Jardin"
          expanded={expanded || mobileSidebarOpen}
          active={!needsNav && activeView === "all" && selectedGardenId === null}
          onClick={() => {
            setActiveView("all");
            setSelectedGardenId(null);
            if (needsNav) router.push("/dashboard");
            closeOnMobile();
          }}
        />
        <NavItem
          icon="🔍"
          label="Recherche"
          expanded={expanded || mobileSidebarOpen}
          active={!needsNav && activeView === "search"}
          onClick={() => {
            setActiveView("search");
            if (needsNav) router.push("/dashboard");
            closeOnMobile();
          }}
        />
        <NavItem
          icon="⭐"
          label="Favoris"
          expanded={expanded || mobileSidebarOpen}
          active={!needsNav && activeView === "favorites"}
          onClick={() => {
            setActiveView("favorites");
            setSelectedGardenId(null);
            if (needsNav) router.push("/dashboard");
            closeOnMobile();
          }}
        />
        <NavItem
          icon="📦"
          label="Archives"
          expanded={expanded || mobileSidebarOpen}
          active={!needsNav && activeView === "archives"}
          onClick={() => {
            setActiveView("archives");
            setSelectedGardenId(null);
            if (needsNav) router.push("/dashboard");
            closeOnMobile();
          }}
        />
        <NavItem
          icon="🏷️"
          label="Tags"
          expanded={expanded || mobileSidebarOpen}
          active={isOnTagsPage}
          onClick={() => { router.push("/dashboard/tags"); closeOnMobile(); }}
        />
        <NavItem
          icon="📓"
          label="Journal"
          expanded={expanded || mobileSidebarOpen}
          active={isOnJournalPage}
          onClick={() => { router.push("/dashboard/journal"); closeOnMobile(); }}
        />

        {/* Separator + section label */}
        <div className="mt-3 mb-1.5 shrink-0">
          <div className="h-px bg-white/10 mx-1" />
          {(expanded || mobileSidebarOpen) && (
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest px-2 mt-2">
              Mes jardins
            </p>
          )}
        </div>

        {/* Garden list */}
        {gardens.map((garden) => (
          <GardenItem
            key={garden.id}
            garden={garden}
            active={!needsNav && selectedGardenId === garden.id}
            expanded={expanded || mobileSidebarOpen}
            autoEdit={garden.id === pendingRenameId}
            onAutoEditDone={() => setPendingRenameId(null)}
            onClick={() => {
              setSelectedGardenId(garden.id);
              setActiveView("all");
              if (needsNav) router.push("/dashboard");
              closeOnMobile();
            }}
            onRename={handleRenameGarden}
          />
        ))}

        {/* Create error */}
        {createError && expanded && (
          <p className="font-mono text-[10px] text-red-300 px-3 py-1 leading-snug">
            {createError}
          </p>
        )}

        {/* New garden button */}
        <SidebarTooltip label="Nouveau jardin">
          <button
            onClick={handleCreateGarden}
            disabled={creatingGarden}
            className="
              flex items-center gap-2.5 w-full px-3 py-2 rounded-card
              text-white/40 hover:text-white hover:bg-white/5
              transition-all duration-150 disabled:opacity-50
            "
          >
            <span className="shrink-0 w-5 flex items-center justify-center text-base font-mono">
              {creatingGarden ? "…" : "+"}
            </span>
            {(expanded || mobileSidebarOpen) && (
              <span className="font-sans text-sm truncate">
                {creatingGarden ? "Création…" : "Nouveau jardin"}
              </span>
            )}
          </button>
        </SidebarTooltip>
      </div>

      {/* ── Footer: user → profile ───────────────────────────── */}
      <div className="shrink-0">
        <div className="h-px bg-white/10 mx-3" />
        <div className="flex items-center gap-1 px-2 py-2">
          {/* Profile button (avatar + email) */}
          <SidebarTooltip label="Mon profil">
            <button
              onClick={() => { router.push("/dashboard/profile"); closeOnMobile(); }}
              className={`
                flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 rounded-card
                transition-all duration-150
                ${isOnProfilePage
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              {/* Active accent bar */}
              {isOnProfilePage && (
                <span className="absolute left-0 w-0.5 h-4 bg-garden-yellow rounded-r-full" />
              )}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {(expanded || mobileSidebarOpen) && (
                <p className="font-mono text-[11px] truncate flex-1 text-left">{displayName}</p>
              )}
            </button>
          </SidebarTooltip>

          {/* Logout button */}
          {(expanded || mobileSidebarOpen) ? (
            <button
              onClick={handleLogout}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-card text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150 font-mono text-sm"
              title="Déconnexion"
              aria-label="Se déconnecter"
            >
              ↪
            </button>
          ) : (
            <SidebarTooltip label="Déconnexion">
              <button
                onClick={handleLogout}
                className="w-7 h-7 flex items-center justify-center rounded-card text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150 font-mono text-sm"
              >
                ↪
              </button>
            </SidebarTooltip>
          )}
        </div>
      </div>
    </aside>
  );
}
