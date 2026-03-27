/**
 * Analytics Helper — Lightweight, fire-and-forget tracking.
 * Never blocks the UI. All functions are async and silently catch errors.
 */

import { supabase } from "./supabase";

// ─── TYPES ──────────────────────────────────────────────────

export type VisitRole =
  | "guest"
  | "admin"
  | "board"
  | "landlord"
  | "tenant"
  | "superadmin";

// ─── PAGE VISIT TRACKING ────────────────────────────────────

/**
 * Track a page visit. Fire-and-forget — never throws, never blocks.
 * Call from useEffect() in client components.
 */
export function trackPageVisit(
  page: string,
  opts?: { userId?: string; role?: VisitRole }
): void {
  // Run completely async — never await this
  void (async () => {
    try {
      await supabase.from("page_visits").insert({
        page,
        user_id: opts?.userId ?? null,
        role: opts?.role ?? "guest",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
    } catch {
      // Silently ignore — analytics must never break the app
    }
  })();
}

// ─── LOGIN TRACKING ─────────────────────────────────────────

/**
 * Track a successful login. Fire-and-forget — never throws, never blocks.
 */
export function trackLogin(userId: string, role: string): void {
  void (async () => {
    try {
      await supabase.from("user_logins").insert({
        user_id: userId,
        role,
        login_time: new Date().toISOString(),
      });
    } catch {
      // Silently ignore
    }
  })();
}

// ─── ANALYTICS READS (for superadmin dashboard) ─────────────

export type DateFilter = "today" | "7d" | "30d";

function getDateFrom(filter: DateFilter): string {
  const now = new Date();
  if (filter === "today") {
    now.setHours(0, 0, 0, 0);
  } else if (filter === "7d") {
    now.setDate(now.getDate() - 7);
  } else {
    now.setDate(now.getDate() - 30);
  }
  return now.toISOString();
}

export type AnalyticsSummary = {
  totalVisits: number;
  homeVisits: number;
  pricingVisits: number;
  loginVisits: number;
  totalLogins: number;
  societyLogins: number;
  landlordLogins: number;
  tenantLogins: number;
  superadminLogins: number;
};

export async function getAnalyticsSummary(
  filter: DateFilter = "7d"
): Promise<AnalyticsSummary> {
  const from = getDateFrom(filter);

  const [visitsResult, loginsResult] = await Promise.all([
    supabase
      .from("page_visits")
      .select("page", { count: "exact" })
      .gte("created_at", from),
    supabase
      .from("user_logins")
      .select("role", { count: "exact" })
      .gte("login_time", from),
  ]);

  const visits = visitsResult.data ?? [];
  const logins = loginsResult.data ?? [];

  return {
    totalVisits: visitsResult.count ?? visits.length,
    homeVisits: visits.filter((v) => v.page === "/").length,
    pricingVisits: visits.filter(
      (v) => v.page === "/pricing" || v.page === "/#pricing"
    ).length,
    loginVisits: visits.filter((v) =>
      v.page.includes("login")
    ).length,
    totalLogins: loginsResult.count ?? logins.length,
    societyLogins: logins.filter((l) =>
      l.role === "admin" || l.role === "society_admin"
    ).length,
    landlordLogins: logins.filter((l) => l.role === "landlord").length,
    tenantLogins: logins.filter((l) => l.role === "tenant").length,
    superadminLogins: logins.filter((l) => l.role === "superadmin").length,
  };
}

export type DailyVisit = { date: string; visits: number };

export async function getDailyVisits(
  filter: DateFilter = "7d"
): Promise<DailyVisit[]> {
  const from = getDateFrom(filter);

  const { data } = await supabase
    .from("page_visits")
    .select("created_at")
    .gte("created_at", from)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  // Group by date client-side
  const counts: Record<string, number> = {};
  for (const row of data) {
    const day = row.created_at.slice(0, 10); // "YYYY-MM-DD"
    counts[day] = (counts[day] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([date, visits]) => ({ date, visits }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type PageCount = { page: string; visits: number };

export async function getTopPages(
  filter: DateFilter = "7d",
  limit = 8
): Promise<PageCount[]> {
  const from = getDateFrom(filter);

  const { data } = await supabase
    .from("page_visits")
    .select("page")
    .gte("created_at", from);

  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.page] = (counts[row.page] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([page, visits]) => ({ page, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
}
