"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordOverviewStats, getLandlordRentPayments, getLandlordTickets, type LandlordRentPayment, type LandlordTicket } from "@/lib/landlord-data";

export default function LandlordOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalFlats: number; occupiedFlats: number;
    expectedRent: number; collectedRent: number; overdueRent: number;
  } | null>(null);
  const [payments, setPayments] = useState<LandlordRentPayment[]>([]);
  const [tickets, setTickets] = useState<LandlordTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [s, p, t] = await Promise.all([
        getLandlordOverviewStats(user!.email),
        getLandlordRentPayments(user!.email),
        getLandlordTickets(user!.email).catch(() => [] as LandlordTicket[]),
      ]);
      setStats(s);
      setPayments(p);
      setTickets(t);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?";
  const collectionPct = stats && stats.expectedRent > 0
    ? Math.round((stats.collectedRent / stats.expectedRent) * 100)
    : 0;
  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  const overduePayments = payments.filter((p) => p.status === "overdue");
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const vacantFlatsCount = stats ? stats.totalFlats - stats.occupiedFlats : 0;

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div className="text-xs opacity-60 mb-1">Welcome back,</div>
            <div className="text-xl font-extrabold">{user?.name ?? "Landlord"}</div>
            <div className="text-xs opacity-60 mt-0.5">
              {loading ? "…" : `${stats?.totalFlats ?? 0} Properties`} · Landlord
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">
            {initials}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="🏠" label="Properties" value={loading ? "…" : String(stats?.totalFlats ?? 0)} sub={loading ? undefined : `${stats?.occupiedFlats ?? 0} occupied`} />
        <StatCard icon="💰" label="Expected" value={loading ? "…" : formatCurrency(stats?.expectedRent ?? 0)} sub={currentMonthLabel} />
        <StatCard icon="✅" label="Collected" value={loading ? "…" : formatCurrency(stats?.collectedRent ?? 0)} accent="text-green-700" />
        <StatCard icon="⏰" label="Overdue" value={loading ? "…" : formatCurrency(stats?.overdueRent ?? 0)} accent="text-red-600" />
      </div>

      {/* Collection bar */}
      {!loading && stats && stats.expectedRent > 0 && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-ink">{currentMonthLabel} Rent Collection</span>
            <span className="text-sm font-extrabold text-brand-500">{collectionPct}%</span>
          </div>
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${collectionPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-ink-muted">
            <span>{formatCurrency(stats.collectedRent)} collected</span>
            <span>{formatCurrency(stats.expectedRent)} total</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {!loading && (overduePayments.length > 0 || vacantFlatsCount > 0) && (
        <>
          <h3 className="text-[15px] font-extrabold text-ink mb-3">⚡ Alerts</h3>
          {overduePayments.map((p) => {
            const tenantName = (p.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
            const flatLabel = (p.flat as { flat_number: string; block: string | null } | null);
            return (
              <div key={p.id} className="bg-white rounded-[14px] p-4 border border-border-default border-l-4 border-l-red-500 mb-1.5 flex justify-between items-center gap-3">
                <span className="text-xs text-ink">
                  {tenantName} rent {formatCurrency(p.expected_amount)} OVERDUE
                  {flatLabel ? ` — Flat ${flatLabel.flat_number}${flatLabel.block ? ` (${flatLabel.block})` : ""}` : ""}
                </span>
                <button className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">Send Reminder</button>
              </div>
            );
          })}
          {vacantFlatsCount > 0 && (
            <div className="bg-white rounded-[14px] p-4 border border-border-default border-l-4 border-l-yellow-500 mb-1.5 flex justify-between items-center gap-3">
              <span className="text-xs text-ink">{vacantFlatsCount} vacant {vacantFlatsCount === 1 ? "property" : "properties"} — list them to find tenants</span>
              <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer flex-shrink-0">List Property</button>
            </div>
          )}
        </>
      )}

      {!loading && overduePayments.length === 0 && vacantFlatsCount === 0 && openTickets.length === 0 && stats && (
        <div className="bg-green-50 rounded-[14px] p-5 border border-green-100 text-center">
          <div className="text-2xl mb-1">✨</div>
          <div className="text-sm font-bold text-green-700">All rents collected. No alerts!</div>
        </div>
      )}

      {/* Open Complaints */}
      {!loading && openTickets.length > 0 && (
        <>
          <h3 className="text-[15px] font-extrabold text-ink mb-3 mt-2">🚫 Open Complaints ({openTickets.length})</h3>
          {openTickets.slice(0, 3).map(tk => {
            const flat = tk.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            return (
              <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default border-l-4 border-l-orange-400 mb-1.5 flex justify-between items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-ink">{tk.subject}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{flatLabel} · {tk.priority.toUpperCase()} · {tk.status.replace("_", " ")}</div>
                </div>
                <a href="/landlord/complaints" className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex-shrink-0">View</a>
              </div>
            );
          })}
          {openTickets.length > 3 && (
            <a href="/landlord/complaints" className="block text-center text-xs text-brand-500 font-semibold mt-2">View all {openTickets.length} complaints →</a>
          )}
        </>
      )}
    </div>
  );
}
