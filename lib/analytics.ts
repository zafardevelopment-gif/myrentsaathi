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
  | "superadmin"
  | "guard";

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

// ─── SECTION BREAKDOWN ──────────────────────────────────────

export type SectionCount = { section: string; visits: number };

// First path segment → app section label; anything else is the public website
const SECTION_LABELS: Record<string, string> = {
  admin: "Society Admin",
  board: "Board Member",
  landlord: "Landlord",
  tenant: "Tenant",
  guard: "Guard",
  superadmin: "Superadmin",
};

export function pageSection(page: string): string {
  const seg = page.split("/")[1] ?? "";
  return SECTION_LABELS[seg] ?? "Website";
}

export async function getSectionVisits(
  filter: DateFilter = "7d"
): Promise<SectionCount[]> {
  const from = getDateFrom(filter);

  const { data } = await supabase
    .from("page_visits")
    .select("page")
    .gte("created_at", from);

  if (!data || data.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const section = pageSection(row.page);
    counts[section] = (counts[section] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([section, visits]) => ({ section, visits }))
    .sort((a, b) => b.visits - a.visits);
}

// ─── DETAIL DRILL-DOWNS (clickable dashboard cards) ─────────

export type VisitorInfo = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type VisitDetail = {
  id: string;
  page: string;
  role: string;
  created_at: string;
  user_agent: string | null;
  user: VisitorInfo | null;
};

export type VisitKind = "total" | "home" | "pricing" | "login";

async function fetchUsersByIds(
  ids: string[]
): Promise<Record<string, VisitorInfo>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .in("id", ids);
  const map: Record<string, VisitorInfo> = {};
  for (const u of data ?? []) {
    map[u.id] = { full_name: u.full_name, email: u.email, phone: u.phone };
  }
  return map;
}

/** Individual visit rows behind a Page Visits card, newest first. */
export async function getVisitDetails(
  filter: DateFilter,
  kind: VisitKind,
  limit = 200
): Promise<VisitDetail[]> {
  const from = getDateFrom(filter);
  let query = supabase
    .from("page_visits")
    .select("id, page, role, created_at, user_agent, user_id")
    .gte("created_at", from)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (kind === "home") query = query.eq("page", "/");
  else if (kind === "pricing") query = query.in("page", ["/pricing", "/#pricing"]);
  else if (kind === "login") query = query.ilike("page", "%login%");

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const ids = [...new Set(data.map((r) => r.user_id).filter(Boolean))] as string[];
  const users = await fetchUsersByIds(ids);

  return data.map((r) => ({
    id: r.id,
    page: r.page,
    role: r.role,
    created_at: r.created_at,
    user_agent: r.user_agent,
    user: r.user_id ? users[r.user_id] ?? null : null,
  }));
}

export type LoginDetail = {
  id: string;
  role: string;
  login_time: string;
  user: VisitorInfo | null;
};

export type LoginKind = "total" | "society" | "landlord" | "tenant" | "superadmin";

/** Individual login rows behind a Logins by Role card, newest first. */
export async function getLoginDetails(
  filter: DateFilter,
  kind: LoginKind,
  limit = 200
): Promise<LoginDetail[]> {
  const from = getDateFrom(filter);
  let query = supabase
    .from("user_logins")
    .select("id, user_id, role, login_time")
    .gte("login_time", from)
    .order("login_time", { ascending: false })
    .limit(limit);

  if (kind === "society") query = query.in("role", ["admin", "society_admin"]);
  else if (kind !== "total") query = query.eq("role", kind);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  const ids = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
  const users = await fetchUsersByIds(ids);

  return data.map((r) => ({
    id: r.id,
    role: r.role,
    login_time: r.login_time,
    user: users[r.user_id] ?? null,
  }));
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
