"use client";

import { useEffect } from "react";

/**
 * Shows the browser's native "Leave site? Changes you made may not be saved."
 * confirmation when the user tries to close/reload/navigate away while
 * `hasUnsavedChanges` is true. Same behavior as the Income Tax e-filing portal.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
