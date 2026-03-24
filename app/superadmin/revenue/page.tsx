"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import { getRecentRentPayments, getRevenueStats, type RentPayment } from "@/lib/superadmin-data";

// Static subscription revenue (billing tables not yet wired to real payments)
const MONTHLY_TREND = [
  { month: "Oct", revenue: 680000 },
  { month: "Nov", revenue: 790000 },
  { month: "Dec", revenue: 920000 },
  { month: "Jan", revenue: 1050000 },
  { month: "Feb", revenue: 1142000 },
  { month: "Mar", revenue: 1285000 },
];

const REVENUE_SOURCES = [
  { source: "Society Subscriptions",  amount: 720000, pct: 56, color: "bg-amber-500",  light: "bg-amber-100 text-amber-700" },
  { source: "Landlord Subscriptions", amount: 340000, pct: 26, color: "bg-green-500",  light: "bg-green-100 text-green-700" },
  { source: "Agreement Charges",      amount: 125000, pct: 10, color: "bg-purple-500", light: "bg-purple-100 text-purple-700" },
  { source: "Agent Commissions (net)",amount: 65000,  pct: 5,  color: "bg-blue-500",   light: "bg-blue-100 text-blue-700" },
  { source: "WhatsApp Markup",         amount: 35000,  pct: 3,  color: "bg-cyan-500",   light: "bg-cyan-100 text-cyan-700" },
];

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[9px] text-ink-muted font-bold">₹{(d.revenue / 100000).toFixed(1)}L</div>
          <div
            className="w-full rounded-t-md"
            style={{
              height: `${(d.revenue / max) * 80}%`,
              background: i === data.length - 1 ? "#f59e0b" : i === data.length - 2 ? "#f59e0b60" : "#f59e0b30",
              minHeight: 6,
            }}
          />
          <span className="text-[9px] text-ink-muted">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminRevenue() {
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [stats, setStats] = useState<{ rentThisMonth: number; rentAllTime: number; maintTotal: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([
          getRecentRentPayments(20),
          getRevenueStats(),
        ]);
        setPayments(p);
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const subscriptionMrr = 1285000; // static until billing tables
  const paidCount = payments.filter(p => p.status === "paid").length;
  const overdueCount = payments.filter(p => p.status === "overdue").length;

  return (
    <div>
      {/* Key Metrics */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard
          icon="🗓️"
          label="Subscription MRR"
          value="₹12.85L"
          sub="+12.5% MoM growth"
          accent="text-green-600"
        />
        <StatCard
          icon="📈"
          label="ARR (Projected)"
          value="₹1.54Cr"
          sub="Based on current MRR"
          accent="text-amber-600"
        />
        <StatCard
          icon="🏠"
          label="Rent Collected (DB)"
          value={loading ? "…" : `₹${((stats?.rentThisMonth ?? 0) / 1000).toFixed(0)}K`}
          sub="This month via platform"
          accent="text-green-600"
        />
        <StatCard
          icon="🔧"
          label="Maintenance (DB)"
          value={loading ? "…" : `₹${((stats?.maintTotal ?? 0) / 1000).toFixed(0)}K`}
          sub="Collected via platform"
          accent="text-blue-600"
        />
      </div>

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Trend Chart */}
        <div className="md:col-span-2 bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-4">📊 Monthly Subscription Revenue</div>
          <MiniBarChart data={MONTHLY_TREND} />
          <div className="mt-3 space-y-0">
            {MONTHLY_TREND.map((m, i) => (
              <div key={m.month} className="flex justify-between items-center py-2 border-b border-border-light last:border-0">
                <span className="text-[12px] text-ink-soft font-semibold">{m.month} 2025{i >= 3 ? "/26" : ""}</span>
                <div className="flex items-center gap-4">
                  {i > 0 && (
                    <span className="text-[11px] font-bold text-green-600">
                      +{(((m.revenue - MONTHLY_TREND[i-1].revenue) / MONTHLY_TREND[i-1].revenue) * 100).toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[13px] font-extrabold text-ink">₹{(m.revenue / 100000).toFixed(2)}L</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="bg-white rounded-[14px] p-4 border border-border-default">
          <div className="text-[13px] font-extrabold text-ink mb-3">💰 Revenue by Source</div>
          <div className="space-y-3">
            {REVENUE_SOURCES.map((r) => (
              <div key={r.source}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-ink-soft">{r.source}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.light}`}>{r.pct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-ink w-14 text-right">₹{(r.amount / 1000).toFixed(0)}K</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border-default flex justify-between items-center">
            <span className="text-[12px] font-extrabold text-ink">TOTAL MRR</span>
            <span className="text-[18px] font-extrabold text-amber-600">₹{(subscriptionMrr / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>

      {/* Real Payments from DB */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[13px] font-extrabold text-ink">🧾 Rent Payments — Live from Database</div>
            {!loading && (
              <div className="text-[11px] text-ink-muted mt-0.5">
                {paidCount} paid · {overdueCount} overdue · {payments.length} total
              </div>
            )}
          </div>
          <button className="px-3 py-1.5 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors">
            📥 Export CSV
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-10 text-ink-muted text-sm">
            No payments found. Seed the database to see real data here.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto_auto] gap-4 px-3 py-1.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider border-b border-border-default">
                <span>Flat / Society</span>
                <span>Month</span>
                <span>Method</span>
                <span>Date</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {payments.map((p) => (
                <div key={p.id} className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto_auto] gap-4 px-3 py-2.5 border-b border-border-light last:border-0 items-center hover:bg-warm-50 rounded-lg">
                  <div>
                    <div className="text-[12px] font-semibold text-ink">
                      {p.flat?.flat_number ?? "—"} {p.flat?.block ? `(${p.flat.block})` : ""}
                    </div>
                    <div className="text-[10px] text-ink-muted">{p.society?.name ?? "—"}</div>
                  </div>
                  <span className="text-[11px] text-ink-muted">{p.month_year}</span>
                  <span className="text-[11px] text-ink-muted">{p.payment_method ?? "—"}</span>
                  <span className="text-[11px] text-ink-muted">{p.payment_date ?? "—"}</span>
                  <span className="text-[13px] font-bold text-ink">₹{p.expected_amount.toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    p.status === "paid" ? "bg-green-100 text-green-700" :
                    p.status === "overdue" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-warm-50 rounded-xl p-3 flex justify-between items-start gap-2">
                  <div>
                    <div className="text-[12px] font-semibold text-ink">
                      {p.flat?.flat_number ?? "—"} · {p.society?.name ?? "—"}
                    </div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{p.month_year} · {p.payment_method ?? "—"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-bold text-ink">₹{p.expected_amount.toLocaleString()}</div>
                    <span className={`text-[9px] font-bold ${p.status === "paid" ? "text-green-600" : p.status === "overdue" ? "text-red-500" : "text-yellow-600"}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
