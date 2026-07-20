"use client";

import { MockAuthProvider } from "./MockAuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { UnsavedChangesProvider } from "./UnsavedChangesProvider";
import RouteTracker from "@/components/website/RouteTracker";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MockAuthProvider>
        <UnsavedChangesProvider>
          <RouteTracker />
          {children}
        </UnsavedChangesProvider>
      </MockAuthProvider>
    </ThemeProvider>
  );
}
