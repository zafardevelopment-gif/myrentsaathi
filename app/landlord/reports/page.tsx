"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordOverviewStats, getAllLandlordRentPayments, type LandlordRentPayment } from "@/lib/landlord-data";

export default function LandlordReports() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalFlats: 0, occupiedFlats: 0, expectedRent: 0, collectedRent: 0, overdueRent: 0 });
  const [payments, setPayments] = useState<LandlordRentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [s, p] = await Promise.all([
        getLandlordOverviewStats(user!.email),
        getAllLandlordRentPayments(user!.email),
      ]);
      setStats(s);
      setPayments(p);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  // Group payments by month for property-wise current month view
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPayments = payments.filter((p) => p.month_year === currentMonth);

  // YTD totals
  const ytdCollected = payments.filter((p) => p.status === "paid").reduce((a, p) => a + (p.amount || 0), 0);

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">📊 Financial Reports</h2>

      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="💰" label="Expected This Month" value={formatCurrency(stats.expectedRent)} />
        <StatCard icon="✅" label="Collected" value={formatCurrency(stats.collectedRent)} accent="text-green-700" />
        <StatCard icon="⚠️" label="Overdue" value={formatCurrency(stats.overdueRent)} accent="text-red-600" />
      </div>

      {/* Property-wise income this month */}
      {currentMonthPayments.length > 0 && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
          <div className="text-sm font-extrabold text-ink mb-4">
            Property-wise Income — {new Date(currentMonth + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </div>
          {currentMonthPayments.map((p) => {
            const flat = p.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            const isPaid = p.status === "paid";
            return (
              <div key={p.id} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-ink">{flatLabel}</span>
                  <span className={`text-sm font-extrabold ${isPaid ? "text-green-700" : "text-red-600"}`}>
                    {isPaid ? formatCurrency(p.amount) : "Overdue"}
                  </span>
                </div>
                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isPaid ? "bg-green-500" : "bg-red-400"}`}
                    style={{ width: isPaid ? "100%" : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink mb-3">All-time Summary</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Flats", value: String(stats.totalFlats) },
            { label: "Occupied Flats", value: String(stats.occupiedFlats) },
            { label: "Total Collected (All Time)", value: formatCurrency(ytdCollected), highlight: true },
            { label: "Total Transactions", value: String(payments.length) },
          ].map((d) => (
            <div key={d.label} className="bg-warm-50 rounded-xl p-3">
              <div className="text-[10px] text-ink-muted">{d.label}</div>
              <div className={`text-sm font-extrabold mt-1 ${d.highlight ? "text-brand-500" : "text-ink"}`}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 py-2.5 rounded-xl border border-brand-500 text-brand-500 text-xs font-bold cursor-pointer">⬇ Download PDF</button>
        <button className="flex-1 py-2.5 rounded-xl border border-border-default text-ink-muted text-xs font-bold cursor-pointer">🧾 Tax Summary</button>
      </div>
    </div>
  );
}
