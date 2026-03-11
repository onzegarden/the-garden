"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  exiting: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VISIBLE_MS = 2700; // toast visible for 2.7s before exit animation
const EXIT_MS = 300;     // exit animation duration
const MAX_TOASTS = 3;

// ── Contexts ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  addToast: (message: string, type: ToastType) => void;
}

interface ToastStateContextValue {
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });
const ToastStateContext = createContext<ToastStateContextValue>({ toasts: [] });

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Track timers by toast id so we can clear them if needed
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Marks a toast as "exiting" then removes it after the animation */
  const startExit = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_MS);
    // Overwrite the visible-timer slot with the remove-timer
    timers.current.set(id, removeTimer);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => {
        const next = [{ id, type, message, exiting: false }, ...prev];
        // Hard-trim at MAX_TOASTS — oldest entries are at the tail
        if (next.length > MAX_TOASTS) {
          // Clear lingering timers for trimmed toasts
          next.slice(MAX_TOASTS).forEach((t) => {
            const timer = timers.current.get(t.id);
            if (timer) clearTimeout(timer);
            timers.current.delete(t.id);
          });
          return next.slice(0, MAX_TOASTS);
        }
        return next;
      });

      // Schedule auto-dismiss
      const visibleTimer = setTimeout(() => startExit(id), VISIBLE_MS);
      timers.current.set(id, visibleTimer);
    },
    [startExit]
  );

  const contextValue = useMemo(() => ({ addToast }), [addToast]);
  const stateValue = useMemo(() => ({ toasts }), [toasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastStateContext.Provider value={stateValue}>
        {children}
      </ToastStateContext.Provider>
    </ToastContext.Provider>
  );
}

// ── Public hooks ──────────────────────────────────────────────────────────────

/** Fire toast notifications — returns stable { success, error } functions */
export function useToast() {
  const { addToast } = useContext(ToastContext);
  const success = useCallback(
    (msg: string) => addToast(msg, "success"),
    [addToast]
  );
  const error = useCallback(
    (msg: string) => addToast(msg, "error"),
    [addToast]
  );
  return useMemo(() => ({ success, error }), [success, error]);
}

/** Read current toasts — used by ToastContainer only */
export function useToastState() {
  return useContext(ToastStateContext);
}
