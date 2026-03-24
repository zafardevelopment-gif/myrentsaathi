"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import Link from "next/link";
import {
  getOverviewStats,
  getRecentRentPayments,
  getAllTickets,
  type RentPayment,
  type Ticket,
} from "@/lib/superadmin-data";

// ─── STATIC REVENUE MOCK (no revenue tables yet) ─────────────
const REVENUE_TREND = [
  { month: "Oct", revenue: 680000 },
  { month: "Nov", revenue: 790000 },
  { month: "Dec", revenue: 920000 },
  { month: "Jan", revenue: 1050000 },
  { month: "Feb", revenue: 1142000 },
  { month: "Mar", revenue: 1285000 },
];

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.revenue / max) * 100}%`,
              background: i === data.length - 1 ? "#f59e0b" : "#f59e0b40",
              minHeight: 4,
            }}
          />
          <span className="text-[9px] text-ink-muted font-semibold">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: "🏢", label: "View Societies",     href: "/superadmin/societies",    color: "border-amber-300 hover:bg-amber-50" },
  { icon: "💰", label: "Revenue",            href: "/superadmin/revenue",      color: "border-green-300 hover:bg-green-50" },
  { icon: "🤝", label: "Agent Payouts",      href: "/superadmin/agents",       color: "border-purple-300 hover:bg-purple-50" },
  { icon: "🏷️", label: "Promo Codes",       href: "/superadmin/promos",       color: "border-blue-300 hover:bg-blue-50" },
  { icon: "💬", label: "Support Tickets",    href: "/superadmin/support",      color: "border-red-300 hover:bg-red-50" },
  { icon: "⚙️", label: "Settings",          href: "/superadmin/settings",     color: "border-gray-300 hover:bg-gray-50" },
];

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getOverviewStats>> | null>(null);
  const [recentPayments, setRecentPayments] = useState<RentPayment[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, payments, tickets] = await Promise.all([
          getOverviewStats(),
          getRecentRentPayments(6),
          getAllTickets(),
        ]);
        setStats(s);
        setRecentPayments(payments);
        setRecentTickets(tickets.slice(0, 5));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold mb-2">⚠️ Could not load data</div>
        <div className="text-[12px] text-red-500 mb-3">{error}</div>
        <div className="text-[11px] text-ink-muted">
          Make sure you have run <code className="bg-red-100 px-1 rounded">supabase-superadmin-policies.sql</code> in your Supabase dashboard and seeded the database.
        </div>
      </div>
    );
  }

  const occupancyPct = stats && stats.totalFlats > 0
    ? Math.round((stats.occupiedFlats / stats.totalFlats) * 100)
    : 0;

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a0f00] to-[#3a2005] rounded-[14px] p-5 mb-4 border border-amber-900/40">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <div className="text-xl font-extrabold text-white">
              🏠 MyRent<span className="text-amber-400">Saathi</span> — Platform Command Center
            </div>
            <div className="text-xs text-amber-200/60 mt-1">
              Live data from Supabase • {stats?.totalSocieties ?? 0} societies active
            </div>
          </div>
          <span className="px-3 py-1.5 bg-green-900/50 rounded-full text-[11px] font-bold text-green-400 border border-green-700/50">
            ● LIVE
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard
          icon="🏢"
          label="Total Societies"
          value={String(stats?.totalSocieties ?? 0)}
          sub={`${stats?.activeSocieties ?? 0} active • +${stats?.newSocietiesThisMonth ?? 0} this month`}
          accent="text-amber-600"
        />
        <StatCard
          icon="👤"
          label="Landlords"
          value={String(stats?.totalLandlords ?? 0)}
          sub={`+${stats?.newUsersThisMonth ?? 0} users this month`}
          accent="text-green-600"
        />
        <StatCard
          icon="🏠"
          label="Tenants"
          value={String(stats?.totalTenants ?? 0)}
          sub={`${stats?.totalFlats ?? 0} total flats`}
          accent="text-blue-600"
        />
        <StatCard
          icon="🏘️"
          label="Occupancy"
          value={`${occupancyPct}%`}
          sub={`${stats?.occupiedFlats ?? 0} of ${stats?.totalFlats ?? 0} flats`}
          accent={occupancyPct >= 80 ? "text-green-600" : "text-amber-600"}
        />
      </div>

      {/* Chart + Plan Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Revenue Trend (static until billing tables added) */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-3">📊 Subscription Revenue Trend</div>
          <MiniBarChart data={REVENUE_TREND} />
          <div className="flex justify-between mt-2 text-[10px] text-ink-muted font-semibold">
            <span>Oct ₹6.8L</span>
            <span>Feb ₹11.4L</span>
            <span className="text-amber-600 font-bold">Mar ₹12.85L ↑</span>
          </div>
        </div>

        {/* Plan Breakdown from real DB */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-3">📋 Societies by Plan</div>
          <div className="space-y-3">
            {[
              { label: "Enterprise",    count: stats?.enterpriseSocieties ?? 0,   color: "bg-purple-500", badge: "bg-purple-100 text-purple-700", price: "₹9,999/mo" },
              { label: "Professional",  count: stats?.professionalSocieties ?? 0, color: "bg-amber-500",  badge: "bg-amber-100 text-amber-700",  price: "₹5,999/mo" },
              { label: "Starter",       count: stats?.starterSocieties ?? 0,      color: "bg-blue-500",   badge: "bg-blue-100 text-blue-700",    price: "₹2,999/mo" },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.badge}`}>{p.label}</span>
                    <span className="text-[11px] text-ink-muted">{p.price}</span>
                  </div>
                  <span className="text-[13px] font-bold text-ink">{p.count} societies</span>
                </div>
                <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.color} rounded-full`}
                    style={{ width: stats?.totalSocieties ? `${(p.count / stats.totalSocieties) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Ticket alert */}
          {(stats?.openTickets ?? 0) > 0 && (
            <div className="mt-4 p-2.5 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center">
              <span className="text-[11px] font-bold text-red-600">
                🔴 {stats?.openTickets} open tickets
                {(stats?.urgentTickets ?? 0) > 0 && ` • ${stats?.urgentTickets} urgent`}
              </span>
              <Link href="/superadmin/support" className="text-[10px] text-red-500 font-bold hover:underline">
                View →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments + Tickets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Recent Rent Payments */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[13px] font-extrabold text-ink">🧾 Recent Rent Payments</div>
            <Link href="/superadmin/revenue" className="text-[11px] text-brand-500 font-bold hover:underline">
              All →
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-[12px]">No payments yet. Seed the database first.</div>
          ) : (
            <div className="space-y-0">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex justify-between items-start py-2 border-b border-border-light last:border-0 gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-ink truncate">
                      {p.flat?.flat_number ?? "—"} · {p.society?.name ?? "—"}
                    </div>
                    <div className="text-[10px] text-ink-muted">{p.month_year} · {p.payment_method ?? "pending"}</div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-[12px] font-bold text-ink">₹{p.expected_amount.toLocaleString()}</div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                      p.status === "paid" ? "bg-green-100 text-green-700" :
                      p.status === "overdue" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[13px] font-extrabold text-ink">🎫 Recent Tickets</div>
            <Link href="/superadmin/support" className="text-[11px] text-brand-500 font-bold hover:underline">
              All →
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-[12px]">No tickets yet.</div>
          ) : (
            <div className="space-y-0">
              {recentTickets.map((t) => (
                <div key={t.id} className="flex justify-between items-start py-2 border-b border-border-light last:border-0 gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-ink truncate">{t.subject}</div>
                    <div className="text-[10px] text-ink-muted">
                      {(t.society as {name:string}|null)?.name ?? "—"} · {t.category}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                    t.priority === "urgent" ? "bg-red-100 text-red-700" :
                    t.priority === "high"   ? "bg-orange-100 text-orange-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default">
        <div className="text-[13px] font-extrabold text-ink mb-3">⚡ Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${a.color}`}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-[12px] font-bold text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
