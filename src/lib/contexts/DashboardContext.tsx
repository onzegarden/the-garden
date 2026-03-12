"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Garden, Profile } from "@/lib/types";

export type SidebarView = "all" | "favorites" | "search" | "archives";

interface DashboardContextValue {
  // Sidebar state
  sidebarExpanded: boolean;
  setSidebarExpanded: (v: boolean) => void;
  toggleSidebar: () => void;

  // Mobile sidebar overlay
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  // Active view / garden
  activeView: SidebarView;
  setActiveView: (v: SidebarView) => void;
  selectedGardenId: string | null;
  setSelectedGardenId: (id: string | null) => void;

  // Gardens list (managed here so sidebar and dashboard stay in sync)
  gardens: Garden[];
  setGardens: (g: Garden[]) => void;
  addGarden: (g: Garden) => void;
  updateGarden: (g: Garden) => void;
  removeGarden: (id: string) => void;

  // Profile (shared between ProfileClient and Sidebar for real-time updates)
  profile: Profile | null;
  setProfile: (p: Profile) => void;

  // Garden settings modal (opened from header or sidebar)
  settingsGarden: Garden | null;
  openGardenSettings: (g: Garden) => void;
  closeGardenSettings: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  initialGardens,
  initialProfile = null,
}: {
  children: ReactNode;
  initialGardens: Garden[];
  initialProfile?: Profile | null;
}) {
  const [sidebarExpanded, setSidebarExpandedRaw] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("all");
  const [selectedGardenId, setSelectedGardenId] = useState<string | null>(null);
  const [gardens, setGardens] = useState<Garden[]>(initialGardens);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [settingsGarden, setSettingsGarden] = useState<Garden | null>(null);

  // Persist sidebar state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("garden:sidebarExpanded");
    if (stored !== null) setSidebarExpandedRaw(stored === "true");
  }, []);

  const setSidebarExpanded = useCallback((v: boolean) => {
    setSidebarExpandedRaw(v);
    localStorage.setItem("garden:sidebarExpanded", String(v));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(!sidebarExpanded);
  }, [sidebarExpanded, setSidebarExpanded]);

  const addGarden = useCallback(
    (g: Garden) => setGardens((prev) => [...prev, g]),
    []
  );

  const updateGarden = useCallback(
    (g: Garden) =>
      setGardens((prev) => prev.map((p) => (p.id === g.id ? g : p))),
    []
  );

  const removeGarden = useCallback((id: string) => {
    setGardens((prev) => prev.filter((g) => g.id !== id));
    setSelectedGardenId((curr) => (curr === id ? null : curr));
  }, []);

  const openGardenSettings = useCallback((g: Garden) => setSettingsGarden(g), []);
  const closeGardenSettings = useCallback(() => setSettingsGarden(null), []);

  return (
    <DashboardContext.Provider
      value={{
        sidebarExpanded,
        setSidebarExpanded,
        toggleSidebar,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        activeView,
        setActiveView,
        selectedGardenId,
        setSelectedGardenId,
        gardens,
        setGardens,
        addGarden,
        updateGarden,
        removeGarden,
        profile,
        setProfile,
        settingsGarden,
        openGardenSettings,
        closeGardenSettings,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
