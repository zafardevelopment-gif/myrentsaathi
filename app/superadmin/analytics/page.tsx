"use client";

import { useEffect, useState } from "react";
import {
  getAnalyticsSummary,
  getDailyVisits,
  getTopPages,
  getSectionVisits,
  type AnalyticsSummary,
  type DailyVisit,
  type PageCount,
  type SectionCount,
  type DateFilter,
} from "@/lib/analytics";

// ─── HELPERS ────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  label,
  value,
  icon,
  sub,
  color = "amber",
}: {
  label: string;
  value: number | string;
  icon: string;
  sub?: string;
  color?: "amber" | "blue" | "green" | "purple" | "rose";
}) {
  const bg: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    rose: "bg-rose-50 border-rose-200",
  };
  const text: Record<string, string> = {
    amber: "text-amber-700",
    blue: "text-blue-700",
    green: "text-green-700",
    purple: "text-purple-700",
    rose: "text-rose-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${text[color]}`}>{label}</span>
      </div>
      <div className={`text-3xl font-extrabold ${text[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function BarChart({ data }: { data: DailyVisit[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No visit data for this period.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.visits), 1);
  const BAR_AREA = 96; // px — tallest bar height; percentage heights collapse inside auto-height flex columns
  return (
    <div className="flex items-end justify-center gap-1 w-full">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.visits / max) * BAR_AREA));
        // With many bars the labels overlap — show every 4th date instead
        const label = data.length > 10 && i % 4 !== 0 ? " " : d.date.slice(5); // "MM-DD"
        return (
          <div key={d.date} className="flex flex-col items-center flex-1 max-w-16 gap-1 group">
            <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.visits}
            </div>
            <div
              className="w-full bg-amber-400 rounded-t hover:bg-amber-500 transition-colors"
              style={{ height: `${h}px` }}
              title={`${d.date}: ${d.visits} visits`}
            />
            <div className="text-[9px] text-gray-400 whitespace-nowrap">
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────

export default function AnalyticsPage() {
  const [filter, setFilter] = useState<DateFilter>("today");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyVisits, setDailyVisits] = useState<DailyVisit[]>([]);
  const [topPages, setTopPages] = useState<PageCount[]>([]);
  const [sections, setSections] = useState<SectionCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAnalyticsSummary(filter),
      getDailyVisits(filter),
      getTopPages(filter, 8),
      getSectionVisits(filter),
    ])
      .then(([s, dv, tp, sec]) => {
        setSummary(s);
        setDailyVisits(dv);
        setTopPages(tp);
        setSections(sec);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filterLabels: Record<DateFilter, string> = {
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
  };

  function handleDownloadReport() {
    if (!summary) return;
    const today = new Date().toISOString().slice(0, 10);
    const rows: string[][] = [
      ["MyRentSaathi — Analytics Report"],
      ["Period", filterLabels[filter]],
      ["Generated", today],
      [],
      ["PAGE VISITS"],
      ["Total Visits", String(summary.totalVisits)],
      ["Home (/)", String(summary.homeVisits)],
      ["Pricing (/pricing)", String(summary.pricingVisits)],
      ["Login Pages", String(summary.loginVisits)],
      [],
      ["LOGINS BY ROLE"],
      ["Total Logins", String(summary.totalLogins)],
      ["Society (admin/board)", String(summary.societyLogins)],
      ["Landlord", String(summary.landlordLogins)],
      ["Tenant", String(summary.tenantLogins)],
      ["Superadmin", String(summary.superadminLogins)],
      [],
      ["APP SECTIONS VISITED"],
      ["Section", "Visits"],
      ...sections.map((s) => [s.section, String(s.visits)]),
      [],
      ["DAILY VISITS"],
      ["Date", "Visits"],
      ...dailyVisits.map((d) => [d.date, String(d.visits)]),
      [],
      ["TOP PAGES"],
      ["Page", "Visits"],
      ...topPages.map((p) => [p.page, String(p.visits)]),
    ];
    downloadCSV(`analytics_report_${filter}_${today}.csv`, rows);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">📊 Analytics Dashboard</h1>
          <p className="text-sm text-ink-muted mt-0.5">Platform traffic and login activity</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter Tabs */}
          <div className="flex gap-1 bg-warm-100 rounded-xl p-1 border border-border-default">
            {(["today", "7d", "30d"] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === f
                    ? "bg-amber-600 text-white shadow"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>

          {/* Download Report */}
          <button
            onClick={handleDownloadReport}
            disabled={loading || !summary}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-border-default text-ink hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇️ Download Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-amber-600 font-bold animate-pulse">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Page Visit Summary */}
          <section>
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">
              Page Visits
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Visits"
                value={summary?.totalVisits ?? 0}
                icon="👁️"
                color="amber"
              />
              <StatCard
                label="Home"
                value={summary?.homeVisits ?? 0}
                icon="🏠"
                color="blue"
                sub="/"
              />
              <StatCard
                label="Pricing"
                value={summary?.pricingVisits ?? 0}
                icon="💎"
                color="purple"
                sub="/pricing"
              />
              <StatCard
                label="Login Pages"
                value={summary?.loginVisits ?? 0}
                icon="🔑"
                color="green"
                sub="all login routes"
              />
            </div>
          </section>

          {/* Login Summary */}
          <section>
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">
              Logins by Role
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard
                label="Total Logins"
                value={summary?.totalLogins ?? 0}
                icon="🚀"
                color="amber"
              />
              <StatCard
                label="Society"
                value={summary?.societyLogins ?? 0}
                icon="🏢"
                color="blue"
                sub="admin / board"
              />
              <StatCard
                label="Landlord"
                value={summary?.landlordLogins ?? 0}
                icon="🔑"
                color="green"
              />
              <StatCard
                label="Tenant"
                value={summary?.tenantLogins ?? 0}
                icon="👤"
                color="purple"
              />
              <StatCard
                label="Superadmin"
                value={summary?.superadminLogins ?? 0}
                icon="⚡"
                color="rose"
              />
            </div>
          </section>

          {/* App Sections */}
          <section className="bg-white rounded-xl border border-border-default p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-4">🧭 App Sections Visited</h2>
            {sections.length === 0 ? (
              <p className="text-sm text-gray-400">No section data for this period.</p>
            ) : (
              <div className="space-y-2">
                {sections.map((s) => {
                  const max = sections[0]?.visits ?? 1;
                  const pct = Math.round((s.visits / max) * 100);
                  const icons: Record<string, string> = {
                    Website: "🌐",
                    "Society Admin": "🏢",
                    "Board Member": "📋",
                    Landlord: "🔑",
                    Tenant: "👤",
                    Guard: "🛡️",
                    Superadmin: "⚡",
                  };
                  return (
                    <div key={s.section} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{icons[s.section] ?? "📄"}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-semibold text-ink">{s.section}</span>
                          <span className="text-amber-700 font-bold">{s.visits}</span>
                        </div>
                        <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Daily Visits Chart */}
          <section className="bg-white rounded-xl border border-border-default p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-4">
              📈 Daily Visits — {filterLabels[filter]}
            </h2>
            <BarChart data={dailyVisits} />
          </section>

          {/* Top Pages */}
          <section className="bg-white rounded-xl border border-border-default p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-4">🔥 Top Pages</h2>
            {topPages.length === 0 ? (
              <p className="text-sm text-gray-400">No page data for this period.</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((p, i) => {
                  const max = topPages[0]?.visits ?? 1;
                  const pct = Math.round((p.visits / max) * 100);
                  return (
                    <div key={p.page} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-mono text-ink truncate max-w-[200px]">{p.page}</span>
                          <span className="text-amber-700 font-bold">{p.visits}</span>
                        </div>
                        <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
