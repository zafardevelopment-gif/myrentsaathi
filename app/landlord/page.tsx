"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getLandlordOverviewStats, getLandlordRentPayments, getLandlordTickets,
  getLandlordAgreements, getLandlordFlats, getLandlordUserId,
  type LandlordRentPayment, type LandlordTicket, type LandlordAgreement, type LandlordFlat,
} from "@/lib/landlord-data";

function CollapsibleSection({
  title, defaultOpen = false, badge, rightLink, children,
}: {
  title: string; defaultOpen?: boolean; badge?: string | number;
  rightLink?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center mb-2.5 cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-extrabold text-ink">{title}</h3>
          {badge !== undefined && (
            <span className="bg-brand-100 text-brand-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rightLink && !open && (
            <span className="text-[11px] text-brand-500 font-semibold">{rightLink.label}</span>
          )}
          <span className={`text-ink-muted text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>›</span>
        </div>
      </button>
      {open && (
        <div>
          {rightLink && (
            <div className="flex justify-end mb-2">
              <Link href={rightLink.href} className="text-[11px] text-brand-500 font-semibold no-underline">{rightLink.label}</Link>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: "📱", label: "WhatsApp", desc: "Send reminders", href: "/landlord/whatsapp" },
  { icon: "🏠", label: "Add Property", desc: "Register new", href: "/landlord/properties" },
  { icon: "📄", label: "Agreements", desc: "View & create", href: "/landlord/agreements" },
  { icon: "📊", label: "Reports", desc: "Income & tax", href: "/landlord/reports" },
  { icon: "💰", label: "Rent Hike", desc: "Increase rent", href: "/landlord/rent-hike" },
  { icon: "🔔", label: "Notices", desc: "Send notice", href: "/landlord/notices" },
];

type SocietyNotice = { id: string; title: string; content: string; notice_type: string; created_at: string; society?: { name: string } | null };
type SocietyPoll = { id: string; title: string; description: string; status: string; ends_at: string | null; society?: { name: string } | null };

// Flat detail modal
function FlatDetailModal({ flat, payment, onClose }: {
  flat: LandlordFlat;
  payment: LandlordRentPayment | null;
  onClose: () => void;
}) {
  const society = flat.society as { name: string; city: string } | null;
  const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
  const rentStatus = payment?.status ?? (flat.status === "vacant" ? "vacant" : "—");

  const statusColor = rentStatus === "paid" ? "text-green-700 bg-green-50 border-green-200"
    : rentStatus === "overdue" ? "text-red-600 bg-red-50 border-red-200"
    : rentStatus === "pending" ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-ink-muted bg-warm-50 border-border-default";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-lg font-extrabold text-ink">
                Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
              </div>
              {society && <div className="text-xs text-ink-muted mt-0.5">{society.name} · {society.city}</div>}
            </div>
            <button onClick={onClose} className="text-ink-muted text-xl cursor-pointer p-1">✕</button>
          </div>

          {/* Flat info */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Type", value: flat.flat_type ?? "—" },
              { label: "Floor", value: flat.floor_number != null ? `Floor ${flat.floor_number}` : "—" },
              { label: "Area", value: flat.area_sqft ? `${flat.area_sqft} sq.ft` : "—" },
              { label: "Status", value: flat.status },
              { label: "Monthly Rent", value: flat.monthly_rent ? formatCurrency(flat.monthly_rent) : "—" },
              { label: "Security Deposit", value: flat.security_deposit ? formatCurrency(flat.security_deposit) : "—" },
            ].map(d => (
              <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
              </div>
            ))}
          </div>

          {/* Tenant info */}
          {tenantUser ? (
            <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-100">
              <div className="text-[10px] text-green-700 font-bold uppercase mb-2">Current Tenant</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-extrabold text-green-800">
                  {tenantUser.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-ink">{tenantUser.full_name}</div>
                  <div className="text-[11px] text-ink-muted">{tenantUser.phone}</div>
                  <div className="text-[11px] text-ink-muted">{tenantUser.email}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-warm-50 rounded-xl p-3 mb-3 border border-dashed border-border-default text-center text-xs text-ink-muted">
              No tenant — property vacant
            </div>
          )}

          {/* This month rent status */}
          {payment && (
            <div className={`rounded-xl p-3 border mb-3 ${statusColor}`}>
              <div className="text-[10px] font-bold uppercase mb-1">
                {new Date(payment.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })} Rent
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-extrabold">{formatCurrency(payment.expected_amount)}</span>
                <span className="text-xs font-bold capitalize">{payment.status}</span>
              </div>
              {payment.payment_date && (
                <div className="text-[11px] mt-1">
                  Paid on {new Date(payment.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {payment.payment_method ? ` via ${payment.payment_method.toUpperCase()}` : ""}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <Link href="/landlord/properties" className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold text-center no-underline">
            Manage Property
          </Link>
          {tenantUser && (
            <a href={`https://wa.me/${tenantUser.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-xs font-bold text-center no-underline">
              📱 WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [societyNotices, setSocietyNotices] = useState<SocietyNotice[]>([]);
  const [societyPolls, setSocietyPolls] = useState<SocietyPoll[]>([]);
  const [loading, setLoading] = useState(true);

  // Flat detail modal
  const [detailFlat, setDetailFlat] = useState<LandlordFlat | null>(null);

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

      // Fetch society notices + polls for the landlord's societies
      const societyIds = [...new Set(f.map(fl => fl.society_id).filter(Boolean))];
      const lid = await getLandlordUserId(user!.email);
      if (societyIds.length > 0) {
        const [noticesRes, pollsRes] = await Promise.all([
          supabase.from("notices")
            .select("id, title, content, notice_type, created_at, society:societies(name)")
            .in("society_id", societyIds)
            .neq("created_by", lid ?? "")  // only others' notices (not mine)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase.from("polls")
            .select("id, title, description, status, ends_at, society:societies(name)")
            .in("society_id", societyIds)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);
        setSocietyNotices((noticesRes.data ?? []) as unknown as SocietyNotice[]);
        setSocietyPolls((pollsRes.data ?? []) as unknown as SocietyPoll[]);
      }

      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?";
  const collectionPct = stats && stats.expectedRent > 0
    ? Math.round((stats.collectedRent / stats.expectedRent) * 100) : 0;
  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  const overduePayments = payments.filter((p) => p.status === "overdue");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const vacantFlatsCount = stats ? stats.totalFlats - stats.occupiedFlats : 0;

  const today = new Date();
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const expiringAgreements = agreements.filter(a => {
    if (!a.end_date || a.status !== "active") return false;
    const end = new Date(a.end_date);
    return end >= today && end <= in30;
  });

  // Build payment lookup by tenant user_id (current_tenant_id on flat)
  // payments enriched with tenantId via tenant_id field
  const paymentByTenantUserId: Record<string, LandlordRentPayment> = {};
  payments.forEach(p => {
    const tid = (p as unknown as { tenant_id?: string }).tenant_id;
    if (tid) paymentByTenantUserId[tid] = p;
  });

  // Society grouping
  type SocietyGroup = { id: string; name: string; city: string; flats: LandlordFlat[] };
  const societyMap: Record<string, SocietyGroup> = {};
  const independentFlats: LandlordFlat[] = [];
  flats.forEach(flat => {
    const society = flat.society as { name: string; city: string } | null;
    if (flat.society_id && society) {
      if (!societyMap[flat.society_id]) {
        societyMap[flat.society_id] = { id: flat.society_id, name: society.name, city: society.city, flats: [] };
      }
      societyMap[flat.society_id].flats.push(flat);
    } else {
      independentFlats.push(flat);
    }
  });
  const societyGroups = Object.values(societyMap);

  function getPaymentForFlat(flat: LandlordFlat): LandlordRentPayment | null {
    // Primary: match by flat_id (most reliable)
    const byFlatId = payments.find(p => (p as unknown as { flat_id?: string }).flat_id === flat.id);
    if (byFlatId) return byFlatId;
    // Fallback: match by flat_number + block
    return payments.find(p => {
      const pFlat = p.flat as { flat_number: string; block: string | null } | null;
      return pFlat?.flat_number === flat.flat_number && pFlat?.block === flat.block;
    }) ?? null;
  }

  function getRentStatus(flat: LandlordFlat): string {
    if (flat.status === "vacant") return "vacant";
    return getPaymentForFlat(flat)?.status ?? "pending";
  }

  function getBadgeClass(status: string) {
    if (status === "paid") return "bg-green-50 text-green-700 border-green-200";
    if (status === "overdue") return "bg-red-50 text-red-600 border-red-200";
    if (status === "vacant") return "bg-yellow-50 text-yellow-600 border-yellow-200";
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  function getBorderColor(status: string) {
    if (status === "paid") return "border-l-green-500";
    if (status === "overdue") return "border-l-red-500";
    return "border-l-yellow-400";
  }

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
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">{initials}</div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5">
          {[
            { label: "🏠 Properties", value: loading ? "…" : String(stats?.totalFlats ?? 0), sub: loading ? "" : `${stats?.occupiedFlats ?? 0} occupied`, bg: "bg-white/10" },
            { label: "💰 Expected", value: loading ? "…" : formatCurrency(stats?.expectedRent ?? 0), sub: currentMonthLabel, bg: "bg-white/10" },
            { label: "✅ Collected", value: loading ? "…" : formatCurrency(stats?.collectedRent ?? 0), sub: "", bg: "bg-green-500/25", vc: "text-green-200" },
            { label: "⏰ Overdue", value: loading ? "…" : formatCurrency(stats?.overdueRent ?? 0), sub: "", bg: "bg-red-500/20", vc: "text-red-200" },
            { label: "⏳ Pending", value: loading ? "…" : formatCurrency((stats?.expectedRent ?? 0) - (stats?.collectedRent ?? 0)), sub: "", bg: "bg-yellow-500/15", vc: "text-yellow-100" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl px-3 py-2.5 flex-1 min-w-[90px] flex-shrink-0`}>
              <div className="text-[10px] opacity-70 whitespace-nowrap">{s.label}</div>
              <div className={`text-base font-extrabold whitespace-nowrap ${s.vc ?? ""}`}>{s.value}</div>
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
      <CollapsibleSection title="⚡ Quick Actions" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}
              className="bg-white rounded-[14px] border border-border-default p-3 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors no-underline">
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-[11px] font-extrabold text-ink">{a.label}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">{a.desc}</div>
            </Link>
          ))}
        </div>
      </CollapsibleSection>

      {/* Alerts */}
      {!loading && (overduePayments.length > 0 || pendingPayments.length > 0 || vacantFlatsCount > 0 || expiringAgreements.length > 0) && (
        <CollapsibleSection
          title="🔔 Action Required"
          defaultOpen={true}
          badge={overduePayments.length + pendingPayments.length + expiringAgreements.length + (vacantFlatsCount > 0 ? 1 : 0)}
        >
          {overduePayments.map((p) => {
            const tenantName = (p.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
            const flat = p.flat as { flat_number: string; block: string | null } | null;
            return (
              <div key={p.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-red-500 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span>🔴</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{tenantName} — {formatCurrency(p.expected_amount)} OVERDUE</div>
                    {flat && <div className="text-[11px] text-ink-muted">Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</div>}
                  </div>
                </div>
                <Link href="/landlord/rent" className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold flex-shrink-0 no-underline">Remind</Link>
              </div>
            );
          })}
          {pendingPayments.map((p) => {
            const tenantName = (p.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
            const flat = p.flat as { flat_number: string; block: string | null } | null;
            return (
              <div key={p.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-yellow-400 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span>🟡</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{tenantName} — {formatCurrency(p.expected_amount)} pending</div>
                    {flat && <div className="text-[11px] text-ink-muted">Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</div>}
                  </div>
                </div>
                <Link href="/landlord/rent" className="px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-[11px] font-bold flex-shrink-0 no-underline">View</Link>
              </div>
            );
          })}
          {expiringAgreements.map((a) => {
            const flat = a.flat as { flat_number: string; block: string | null } | null;
            const daysLeft = Math.ceil((new Date(a.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={a.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-orange-400 mb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span>🏠</span>
                  <div>
                    <div className="text-xs font-bold text-ink">{flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—"} — Lease expiring in {daysLeft} days</div>
                    <div className="text-[11px] text-ink-muted">Ends {new Date(a.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                </div>
                <Link href="/landlord/agreements" className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex-shrink-0 no-underline">Renew</Link>
              </div>
            );
          })}
          {vacantFlatsCount > 0 && (
            <div className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-yellow-500 mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span>🏚️</span>
                <div className="text-xs font-bold text-ink">{vacantFlatsCount} vacant {vacantFlatsCount === 1 ? "property" : "properties"}</div>
              </div>
              <Link href="/landlord/properties" className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold flex-shrink-0 no-underline">Manage</Link>
            </div>
          )}
        </CollapsibleSection>
      )}

      {!loading && overduePayments.length === 0 && pendingPayments.length === 0 && vacantFlatsCount === 0 && expiringAgreements.length === 0 && openTickets.length === 0 && (
        <div className="bg-green-50 rounded-[14px] p-5 border border-green-100 text-center mb-4">
          <div className="text-2xl mb-1">✨</div>
          <div className="text-sm font-bold text-green-700">All rents collected · No alerts!</div>
        </div>
      )}

      {/* Open Complaints */}
      {!loading && openTickets.length > 0 && (
        <CollapsibleSection title="🚫 Open Complaints" badge={openTickets.length} rightLink={{ label: "View all →", href: "/landlord/complaints" }}>
          {openTickets.slice(0, 3).map(tk => {
            const flat = tk.flat as { flat_number: string; block: string | null } | null;
            return (
              <div key={tk.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-orange-400 mb-2 flex justify-between items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-ink">{tk.subject}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—"} · {tk.priority.toUpperCase()} · {tk.status.replace("_", " ")}
                  </div>
                </div>
                <Link href="/landlord/complaints" className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold flex-shrink-0 no-underline">View</Link>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Society Notices */}
      {!loading && societyNotices.length > 0 && (
        <CollapsibleSection title="📢 Society Notices" badge={societyNotices.length} rightLink={{ label: "View all →", href: "/landlord/notices" }}>
          {societyNotices.map(n => (
            <div key={n.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-blue-400 mb-2">
              <div className="text-xs font-bold text-ink">{n.title}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {(n.society as { name: string } | null)?.name ?? ""} · {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </div>
              {n.content && <div className="text-[11px] text-ink mt-1 line-clamp-2">{n.content}</div>}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Active Society Polls */}
      {!loading && societyPolls.length > 0 && (
        <CollapsibleSection title="🗳️ Society Polls" badge={societyPolls.length} rightLink={{ label: "View all →", href: "/landlord/polls" }}>
          {societyPolls.map(poll => (
            <div key={poll.id} className="bg-white rounded-[14px] p-3.5 border border-border-default border-l-4 border-l-purple-400 mb-2 flex justify-between items-center gap-3">
              <div>
                <div className="text-xs font-bold text-ink">{poll.title}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {(poll.society as { name: string } | null)?.name ?? ""}
                  {poll.ends_at ? ` · Ends ${new Date(poll.ends_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
                </div>
              </div>
              <Link href="/landlord/polls" className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold flex-shrink-0 no-underline">Vote</Link>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* My Properties — grouped by society */}
      {!loading && flats.length > 0 && (
        <CollapsibleSection title="🏠 My Properties" badge={flats.length} defaultOpen={true} rightLink={{ label: "View all →", href: "/landlord/properties" }}>
        <div>

          {/* Society groups */}
          {societyGroups.map(sg => {
            const occupied = sg.flats.filter(f => f.status === "occupied").length;
            const vacant = sg.flats.filter(f => f.status !== "occupied").length;
            return (
              <div key={sg.id} className="mb-4">
                {/* Society header */}
                <div className="bg-warm-100 rounded-[12px] px-4 py-2.5 mb-2 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-extrabold text-ink">{sg.name}</div>
                    <div className="text-[11px] text-ink-muted">{sg.city}</div>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">{occupied} occupied</span>
                    <span className="bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-lg">{vacant} vacant</span>
                    <span className="bg-brand-50 text-brand-600 font-bold px-2 py-0.5 rounded-lg">{sg.flats.length} total</span>
                  </div>
                </div>
                {/* Flats in this society */}
                <div className="flex flex-col gap-1.5 pl-1">
                  {sg.flats.map(flat => {
                    const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
                    const rentStatus = getRentStatus(flat);
                    const matchedPayment = getPaymentForFlat(flat);
                    return (
                      <button key={flat.id} onClick={() => setDetailFlat(flat)}
                        className={`bg-white rounded-[12px] p-3.5 border border-border-default border-l-4 ${getBorderColor(rentStatus)} flex items-center gap-3 text-left w-full hover:bg-warm-50 transition-colors cursor-pointer`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-ink">
                            Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {flat.flat_type ?? ""}
                            {flat.monthly_rent ? ` · ${formatCurrency(flat.monthly_rent)}/mo` : ""}
                          </div>
                          {tenantUser && <div className="text-[11px] text-ink-muted">👤 {tenantUser.full_name} · {tenantUser.phone}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getBadgeClass(rentStatus)}`}>
                            {rentStatus === "paid" ? "Paid" : rentStatus === "overdue" ? "Overdue" : rentStatus === "vacant" ? "Vacant" : "Pending"}
                          </span>
                          <span className="text-ink-muted text-sm">›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Independent flats (no society) */}
          {independentFlats.length > 0 && (() => {
            const indOccupied = independentFlats.filter(f => f.status === "occupied").length;
            const indVacant = independentFlats.filter(f => f.status !== "occupied").length;
            return (
              <div className="mb-4">
                <div className="bg-warm-100 rounded-[12px] px-4 py-2.5 mb-2 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-extrabold text-ink">Independent Properties</div>
                    <div className="text-[11px] text-ink-muted">No society</div>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">{indOccupied} occupied</span>
                    <span className="bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-lg">{indVacant} vacant</span>
                    <span className="bg-brand-50 text-brand-600 font-bold px-2 py-0.5 rounded-lg">{independentFlats.length} total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pl-1">
                  {independentFlats.map(flat => {
                    const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
                    const rentStatus = getRentStatus(flat);
                    return (
                      <button key={flat.id} onClick={() => setDetailFlat(flat)}
                        className={`bg-white rounded-[12px] p-3.5 border border-border-default border-l-4 ${getBorderColor(rentStatus)} flex items-center gap-3 text-left w-full hover:bg-warm-50 transition-colors cursor-pointer`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-ink">
                            Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {flat.flat_type ?? ""}
                            {flat.monthly_rent ? ` · ${formatCurrency(flat.monthly_rent)}/mo` : ""}
                          </div>
                          {tenantUser && <div className="text-[11px] text-ink-muted">👤 {tenantUser.full_name} · {tenantUser.phone}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getBadgeClass(rentStatus)}`}>
                            {rentStatus === "paid" ? "Paid" : rentStatus === "overdue" ? "Overdue" : rentStatus === "vacant" ? "Vacant" : "Pending"}
                          </span>
                          <span className="text-ink-muted text-sm">›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        </CollapsibleSection>
      )}

      {/* Flat Detail Modal */}
      {detailFlat && (() => {
        const matchedPayment = getPaymentForFlat(detailFlat);
        return <FlatDetailModal flat={detailFlat} payment={matchedPayment} onClose={() => setDetailFlat(null)} />;
      })()}
    </div>
  );
}
