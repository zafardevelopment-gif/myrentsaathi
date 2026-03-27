"use client";

import { useEffect, useState } from "react";
import {
  getAnalyticsSummary,
  getDailyVisits,
  getTopPages,
  type AnalyticsSummary,
  type DailyVisit,
  type PageCount,
  type DateFilter,
} from "@/lib/analytics";

// ─── HELPERS ────────────────────────────────────────────────

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
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d) => {
        const pct = Math.max(4, Math.round((d.visits / max) * 100));
        const label = d.date.slice(5); // "MM-DD"
        return (
          <div key={d.date} className="flex flex-col items-center flex-1 gap-1 group">
            <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.visits}
            </div>
            <div
              className="w-full bg-amber-400 rounded-t hover:bg-amber-500 transition-colors"
              style={{ height: `${pct}%` }}
              title={`${d.date}: ${d.visits} visits`}
            />
            <div className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
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
  const [filter, setFilter] = useState<DateFilter>("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyVisits, setDailyVisits] = useState<DailyVisit[]>([]);
  const [topPages, setTopPages] = useState<PageCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAnalyticsSummary(filter),
      getDailyVisits(filter),
      getTopPages(filter, 8),
    ])
      .then(([s, dv, tp]) => {
        setSummary(s);
        setDailyVisits(dv);
        setTopPages(tp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filterLabels: Record<DateFilter, string> = {
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">📊 Analytics Dashboard</h1>
          <p className="text-sm text-ink-muted mt-0.5">Platform traffic and login activity</p>
        </div>

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
