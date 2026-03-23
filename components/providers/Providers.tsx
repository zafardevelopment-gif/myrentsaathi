"use client";

import { MockAuthProvider } from "./MockAuthProvider";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <MockAuthProvider>{children}</MockAuthProvider>;
}
