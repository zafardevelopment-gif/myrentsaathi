"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageVisit } from "@/lib/analytics";
import { useAuth } from "@/components/providers/MockAuthProvider";

/**
 * Global route tracker — renders nothing, logs a page_visit on every
 * route change across the whole app (website + all dashboards).
 * Mounted once inside Providers so it survives navigations.
 */
export default function RouteTracker() {
  const pathname = usePathname();
  const { user, hydrated } = useAuth();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth hydration so the logged-in user's role is attributed
    // correctly on the very first page load.
    if (!hydrated || !pathname || lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    trackPageVisit(pathname, {
      role: user?.role ?? "guest",
      userId: user?.id,
    });
  }, [pathname, hydrated, user]);

  return null;
}
