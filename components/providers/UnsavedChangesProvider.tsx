"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * App-wide "unsaved changes" tracker. Any page/form registers itself here
 * (via useUnsavedChanges) instead of adding its own beforeunload listener.
 * A single beforeunload listener at the root shows the browser's native
 * "Leave site? Changes you made may not be saved." dialog whenever ANY
 * registered source still has unsaved changes.
 */
const UnsavedChangesContext = createContext<{
  setUnsaved: (key: string, value: boolean) => void;
} | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const setUnsaved = useCallback((key: string, value: boolean) => {
    setDirtyKeys((prev) => {
      const hasKey = prev.has(key);
      if (value === hasKey) return prev;
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (dirtyKeys.size === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyKeys]);

  return (
    <UnsavedChangesContext.Provider value={{ setUnsaved }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Registers `isDirty` under a stable per-caller key. Multiple components can
 * call this independently (e.g. two open forms) — the warning stays active
 * as long as at least one registered source is dirty, and auto-clears on unmount.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const ctx = useContext(UnsavedChangesContext);
  const keyRef = useRef<string>(
    `unsaved-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    if (!ctx) return;
    ctx.setUnsaved(keyRef.current, isDirty);
  }, [ctx, isDirty]);

  useEffect(() => {
    const key = keyRef.current;
    return () => {
      ctx?.setUnsaved(key, false);
    };
  }, [ctx]);
}
