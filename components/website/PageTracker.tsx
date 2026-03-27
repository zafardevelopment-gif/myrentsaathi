"use client";

import { useEffect } from "react";
import { trackPageVisit, type VisitRole } from "@/lib/analytics";

interface Props {
  page: string;
  role?: VisitRole;
  userId?: string;
}

/**
 * Drop-in tracker — renders nothing, fires a single page_visit insert on mount.
 * Place anywhere in a page component tree.
 */
export default function PageTracker({ page, role, userId }: Props) {
  useEffect(() => {
    trackPageVisit(page, { role, userId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
