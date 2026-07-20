"use client";

import { useUnsavedChanges } from "@/components/providers/UnsavedChangesProvider";

/**
 * Registers `hasUnsavedChanges` with the app-wide UnsavedChangesProvider.
 * When true, closing/reloading the tab shows the browser's native
 * "Leave site? Changes you made may not be saved." confirmation.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useUnsavedChanges(hasUnsavedChanges);
}
