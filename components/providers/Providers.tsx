"use client";

import { MockAuthProvider } from "./MockAuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MockAuthProvider>{children}</MockAuthProvider>
    </ThemeProvider>
  );
}
