"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getLandlordOverviewStats, getLandlordRentPayments, getLandlordTickets,
  getLandlordAgreements, getLandlordFlats,
  type LandlordRentPayment, type LandlordTicket, type LandlordAgreement, type LandlordFlat,
} from "@/lib/landlord-data";

const QUICK_ACTIONS = [
  { icon: "📱", label: "WhatsApp", desc: "Send reminders", href: "/landlord/whatsapp" },
  { icon: "🏠", label: "Add Property", desc: "Register new", href: "/landlord/properties" },
  { icon: "📄", label: "Agreements", desc: "View & create", href: "/landlord/agreements" },
  { icon: "📊", label: "Reports", desc: "Income & tax", href: "/landlord/reports" },
  { icon: "💰", label: "Rent Hike", desc: "Increase rent", href: "/landlord/rent-hike" },
  { icon: "🔔", label: "Notices", desc: "Send notice", href: "/landlord/notices" },
];

export default function LandlordOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalFlats: number; occupiedFlats: number;
    expectedRent: number; collectedRent: number; overdueRent: number;
  } | null>(null);
  const [payments, setPayments] = useState<LandlordRentPayment[]>([]);
  const [tickets, setTickets] = useState<LandlordTicket[]>([]);
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [s, p, t, a, f] = await Promise.all([
        getLandlordOverviewStats(user!.email),
        getLandlordRentPayments(user!.email),
        getLandlordTickets(user!.email).catch(() => [] as LandlordTicket[]),
        getLandlordAgreements(user!.email).catch(() => [] as LandlordAgreement[]),
        getLandlordFlats(user!.email).catch(() => [] as LandlordFlat[]),
      ]);
      setStats(s);
      setPayments(p);
      setTickets(t);
      setAgreements(a);
      setFlats(f);
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
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const vacantFlatsCount = stats ? stats.totalFlats - stats.occupiedFlats : 0;

  // Leases expiring within 30 days
  const today = new Date();
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const expiringAgreements = agreements.filter(a => {
    if (!a.end_date || a.status !== "active") return false;
    const end = new Date(a.end_date);
    return end >= today && end <= in30;
  });

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 text-white rounded-[18px] p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute bottom-[-20px] right-[60px] w-20 h-20 rounded-full bg-white/[0.03]" />
        <div className="flex justify-between items-start gap-3 flex-wrap relative">
          <div>
            <div className="text-xs opacity-60 mb-1">Welcome back,</div>
            <div className="text-2xl font-extrabold">{user?.name ?? "Landlord"}</div>
            <div className="text-xs opacity-60 mt-0.5">
              {loading ? "…" : `${stats?.occupiedFlats ?? 0} Properties rented · ${vacantFlatsCount} vacant`} · Landlord
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">
            {initials}
          </div>
        </div>

        {/* All stats in one row */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5">
          {[
            { label: "🏠 Properties", value: loading ? "…" : String(stats?.totalFlats ?? 0), sub: loading ? "" : `${stats?.occupiedFlats ?? 0} occupied`, bg: "bg-white/10" },
            { label: `💰 Expected`, value: loading ? "…" : formatCurrency(stats?.expectedRent ?? 0), sub: currentMonthLabel, bg: "bg-white/10" },
            { label: "✅ Collected", value: loading ? "…" : formatCurrency(stats?.collectedRent ?? 0), sub: "", bg: "bg-green-500/25", valueClass: "text-green-200" },
            { label: "⏰ Overdue", value: loading ? "…" : formatCurrency(stats?.overdueRent ?? 0), sub: "", bg: "bg-red-500/20", valueClass: "text-red-200" },
            { label: "⏳ Pending", value: loading ? "…" : formatCurrency((stats?.expectedRent ?? 0) - (stats?.collectedRent ?? 0)), sub: "", bg: "bg-yellow-500/15", valueClass: "text-yellow-100" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl px-3 py-2.5 flex-1 min-w-[90px] flex-shrink-0`}>
              <div className="text-[10px] opacity-70 whitespace-nowrap">{s.label}</div>
              <div className={`text-base font-extrabold whitespace-nowrap ${s.valueClass ?? ""}`}>{s.value}</div>
              {s.sub && <div className="text-[10px] opacity-60">{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Collection progress bar */}
      {!loading && stats && stats.expectedRent > 0 && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-ink">{currentMonthLabel} Rent Collection</span>
            <span className="text-sm font-extrabold text-brand-500">{collectionPct}%</span>
          </div>
          <div className="h-2.5 bg-warm-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${collectionPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-ink-muted">
            <span>{formatCurrency(stats.collectedRent)} collected</span>
            <span>{formatCurrency(stats.expectedRent)} total</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h3 className="text-[14px] font-extrabold text-ink mb-2.5">⚡ Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2.5 mb-5 sm:grid-cols-6">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}
            className="bg-white rounded-[14px] border border-border-default p-3 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors no-underline">
            <div className="text-2xl mb-1">{a.icon}</div>
            <div className="text-[11px] font-extrabold text-ink">{a.label}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Alerts section */}
      {!loading && (overduePayments.length > 0 || pendingPayments.length > 0 || vacantFlatsCount > 0 || expiringAgreements.length > 0) && (
        <>
          <h3 className="text-[14px] font-extrabold text-ink mb-2.5">🔔 Action Required</h3>

          {/* Overdue alerts */}
          {overduePayments.map((p) => {
            const tenantName = (p.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
            const flat = p.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "";
            return (
              <div key={p.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-red-500 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔴</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{tenantName} — {formatCurrency(p.expected_amount)} OVERDUE</div>
                    {flatLabel && <div className="text-[11px] text-ink-muted">{flatLabel}</div>}
                  </div>
                </div>
                <Link href="/landlord/rent" className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold flex-shrink-0 no-underline">Send Reminder</Link>
              </div>
            );
          })}

          {/* Pending alerts */}
          {pendingPayments.map((p) => {
            const tenantName = (p.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
            const flat = p.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "";
            return (
              <div key={p.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-yellow-400 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟡</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{tenantName} — {formatCurrency(p.expected_amount)} pending</div>
                    {flatLabel && <div className="text-[11px] text-ink-muted">{flatLabel}</div>}
                  </div>
                </div>
                <Link href="/landlord/rent" className="px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] font-bold flex-shrink-0 no-underline">View</Link>
              </div>
            );
          })}

          {/* Expiring leases */}
          {expiringAgreements.map((a) => {
            const flat = a.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            const daysLeft = Math.ceil((new Date(a.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={a.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-orange-400 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🏠</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{flatLabel} — Lease expiring in {daysLeft} days</div>
                    <div className="text-[11px] text-ink-muted">Ends {new Date(a.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                </div>
                <Link href="/landlord/agreements" className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex-shrink-0 no-underline">Renew</Link>
              </div>
            );
          })}

          {/* Vacant properties */}
          {vacantFlatsCount > 0 && (
            <div className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-yellow-500 mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🏚️</span>
                <div className="text-xs font-bold text-ink">{vacantFlatsCount} vacant {vacantFlatsCount === 1 ? "property" : "properties"} — add tenants to start earning</div>
              </div>
              <Link href="/landlord/properties" className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold flex-shrink-0 no-underline">Manage</Link>
            </div>
          )}
        </>
      )}

      {/* All clear */}
      {!loading && overduePayments.length === 0 && pendingPayments.length === 0 && vacantFlatsCount === 0 && expiringAgreements.length === 0 && openTickets.length === 0 && stats && (
        <div className="bg-green-50 rounded-[14px] p-5 border border-green-100 text-center mb-4">
          <div className="text-2xl mb-1">✨</div>
          <div className="text-sm font-bold text-green-700">All rents collected · No alerts!</div>
        </div>
      )}

      {/* Open Complaints */}
      {!loading && openTickets.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-[14px] font-extrabold text-ink">🚫 Open Complaints ({openTickets.length})</h3>
            <Link href="/landlord/complaints" className="text-[11px] text-brand-500 font-semibold no-underline">View all →</Link>
          </div>
          {openTickets.slice(0, 3).map(tk => {
            const flat = tk.flat as { flat_number: string; block: string | null } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            return (
              <div key={tk.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-orange-400 mb-2 flex justify-between items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-ink">{tk.subject}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{flatLabel} · {tk.priority.toUpperCase()} · {tk.status.replace("_", " ")}</div>
                </div>
                <Link href="/landlord/complaints" className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex-shrink-0 no-underline">View</Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Properties Overview */}
      {!loading && flats.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-[14px] font-extrabold text-ink">🏠 My Properties</h3>
            <Link href="/landlord/properties" className="text-[11px] text-brand-500 font-semibold no-underline">View all →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {flats.map((flat) => {
              const society = flat.society as { name: string; city: string } | null;
              const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;

              // Match payment for this flat's tenant
              const flatPayment = payments.find(p => {
                const pFlat = p.flat as { flat_number: string; block: string | null } | null;
                return pFlat?.flat_number === flat.flat_number && pFlat?.block === flat.block;
              });
              const rentStatus = flatPayment?.status ?? (flat.status === "vacant" ? "vacant" : "pending");

              const borderColor =
                flat.status === "vacant" ? "border-l-yellow-400"
                : rentStatus === "paid" ? "border-l-green-500"
                : rentStatus === "overdue" ? "border-l-red-500"
                : "border-l-yellow-400";

              const badgeClass =
                flat.status === "vacant" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : rentStatus === "paid" ? "bg-green-50 text-green-700 border-green-200"
                : rentStatus === "overdue" ? "bg-red-50 text-red-600 border-red-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200";

              const badgeLabel =
                flat.status === "vacant" ? "Vacant"
                : rentStatus === "paid" ? "Paid"
                : rentStatus === "overdue" ? "Overdue"
                : "Pending";

              return (
                <Link key={flat.id} href="/landlord/properties"
                  className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${borderColor} flex items-center gap-3 no-underline hover:bg-warm-50 transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-ink">
                      {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {society ? `${society.name} · ${society.city}` : flat.flat_type ?? ""}
                      {flat.monthly_rent ? ` · ${formatCurrency(flat.monthly_rent)}/mo` : ""}
                    </div>
                    {tenantUser && (
                      <div className="text-[11px] text-ink-muted mt-0.5">👤 {tenantUser.full_name} · {tenantUser.phone}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tenantUser ? (
                      <span className="text-xs font-semibold text-ink-muted">{tenantUser.full_name.split(" ")[0]}</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badgeClass}`}>Vacant</span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badgeClass}`}>{badgeLabel}</span>
                    <span className="text-ink-muted text-sm">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
