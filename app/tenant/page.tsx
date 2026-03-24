"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getTenantProfile,
  getTenantRentPayments,
  getTenantNotices,
  getTenantAgreement,
  type TenantProfile,
  type TenantRentPayment,
  type TenantNotice,
  type TenantAgreement,
} from "@/lib/tenant-data";
import PayRentModal from "@/components/tenant/PayRentModal";
import ReceiptModal from "@/components/tenant/ReceiptModal";
import { Toaster } from "react-hot-toast";
import { getTenantTickets, type TenantTicket } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function TenantHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [payments, setPayments] = useState<TenantRentPayment[]>([]);
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [agreement, setAgreement] = useState<TenantAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [tickets, setTickets] = useState<TenantTicket[]>([]);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const p = await getTenantProfile(user!.email);
      setProfile(p);
      if (p) {
        const [pay, societyNotices, ag, tk] = await Promise.all([
          getTenantRentPayments(user!.email).catch(() => []),
          p.society_id ? getTenantNotices(p.society_id).catch(() => []) : Promise.resolve([]),
          getTenantAgreement(user!.email).catch(() => null),
          getTenantTickets(user!.email).catch(() => []),
        ]);
        // Also fetch landlord direct notices
        let landlordNotices: TenantNotice[] = [];
        if (p.flat_id) {
          const { data: flatData } = await supabase.from("flats").select("owner_id").eq("id", p.flat_id).single();
          if (flatData?.owner_id) {
            const { data: ln } = await supabase
              .from("notices")
              .select("id, title, content, notice_type, audience, created_at")
              .eq("created_by", flatData.owner_id)
              .in("audience", ["all", "tenants"])
              .order("created_at", { ascending: false });
            landlordNotices = (ln ?? []) as TenantNotice[];
          }
        }
        // Merge + deduplicate
        const seen = new Set<string>();
        const allNotices = [...societyNotices, ...landlordNotices].filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
        allNotices.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setPayments(pay);
        setNotices(allNotices);
        setAgreement(ag);
        setTickets(tk);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const tenantUser = profile?.user;
  const flat = profile?.flat as { flat_number: string; block: string | null; flat_type: string | null; monthly_rent: number | null; owner?: { full_name: string } | null } | null;
  const society = profile?.society as { name: string; city: string } | null;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const myPayment = payments.find((p) => p.month_year === currentMonth);
  const onTimePaid = payments.filter((p) => p.status === "paid" && p.payment_date).length;
  const initials = (tenantUser?.full_name ?? user?.name ?? "T").split(" ").map((n) => n[0]).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-6 text-center">
        <div className="text-yellow-700 font-bold">⚠️ Tenant profile not found</div>
        <div className="text-xs text-ink-muted mt-1">Make sure your account is linked to a flat in the database.</div>
      </div>
    );
  }

  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
  const flatLabel = flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";

  async function reloadPayments() {
    if (!user?.email) return;
    const pay = await getTenantRentPayments(user.email).catch(() => [] as TenantRentPayment[]);
    setPayments(pay);
  }

  async function cancelTicket(id: string) {
    if (!confirm("Cancel this complaint?")) return;
    await supabase.from("tickets").delete().eq("id", id);
    toast.success("Complaint cancelled.");
    setTickets(prev => prev.filter(t => t.id !== id));
  }

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");

  return (
    <div>
      <Toaster position="top-center" />
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-[14px] p-5 mb-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <div className="text-xs opacity-60 mb-1">Welcome home,</div>
            <div className="text-xl font-extrabold">{tenantUser?.full_name ?? user?.name}</div>
            <div className="text-xs opacity-70 mt-0.5">
              Flat {flatLabel}{society ? ` · ${society.name}` : ""}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-extrabold flex-shrink-0">
            {initials}
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { label: "Monthly Rent", value: formatCurrency(flat?.monthly_rent ?? 0), color: "text-indigo-200" },
            { label: "Landlord", value: (flat?.owner as { full_name: string } | null)?.full_name ?? "—", color: "text-white" },
            { label: "Flat Type", value: flat?.flat_type ?? "—", color: "text-white" },
          ].map((d) => (
            <div key={d.label} className="bg-white/10 rounded-xl px-3 py-2 flex-1 min-w-[90px]">
              <div className="text-[9px] uppercase tracking-wide opacity-50">{d.label}</div>
              <div className={`text-sm font-extrabold mt-0.5 ${d.color}`}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current month status */}
      {myPayment?.status === "paid" ? (
        <div className="bg-green-50 rounded-[14px] p-4 border border-green-100 mb-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">✅</div>
              <div>
                <div className="text-sm font-extrabold text-green-700">{currentMonthLabel} Rent — Paid</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {formatCurrency(myPayment.amount)}
                  {myPayment.payment_method ? ` via ${myPayment.payment_method}` : ""}
                  {myPayment.payment_date ? ` on ${myPayment.payment_date}` : ""}
                </div>
              </div>
            </div>
            <button onClick={() => setShowReceipt(true)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">Get Receipt</button>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 rounded-[14px] p-4 border border-red-100 mb-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <div className="text-sm font-extrabold text-red-700">{currentMonthLabel} Rent — {myPayment?.status === "overdue" ? "Overdue" : "Pending"}</div>
                <div className="text-xs text-ink-muted mt-0.5">{formatCurrency(flat?.monthly_rent ?? myPayment?.expected_amount ?? 0)} due</div>
              </div>
            </div>
            <button onClick={() => setShowPayModal(true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer">Pay Now</button>
          </div>
        </div>
      )}

      {/* Payment streak */}
      {payments.length > 0 && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-ink">🔥 On-time Payment Streak</span>
            <span className="text-sm font-extrabold text-brand-500">{onTimePaid} months</span>
          </div>
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${payments.length > 0 ? Math.min(100, (onTimePaid / payments.length) * 100) : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-ink-muted mt-2">Keep it up! You have a great payment record.</div>
        </div>
      )}

      {/* Agreement */}
      {agreement && (
        <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-ink">📄 Rental Agreement</span>
            <span className="inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold bg-green-100 text-green-700 capitalize">{agreement.status}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Type", value: agreement.tier?.replace("_", " ") ?? "Standard" },
              { label: "Valid Till", value: new Date(agreement.end_date).toLocaleDateString("en-IN") },
              { label: "Rent", value: formatCurrency(agreement.monthly_rent) },
              { label: "Deposit", value: formatCurrency(agreement.security_deposit ?? 0) },
            ].map(d => (
              <div key={d.label} className="flex-1 min-w-[80px] bg-warm-50 rounded-xl p-2">
                <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                <div className="text-xs font-extrabold text-ink mt-0.5 capitalize">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent notices */}
      {notices.length > 0 && (
        <>
          <h3 className="text-[15px] font-extrabold text-ink mb-3">📢 Recent Notices</h3>
          {notices.slice(0, 2).map((n) => (
            <div key={n.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-base flex-shrink-0">📢</div>
              <div>
                <div className="text-sm font-bold text-ink">{n.title}</div>
                <div className="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">{n.content}</div>
                <div className="text-[10px] text-ink-muted mt-1">{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Open Complaints */}
      {openTickets.length > 0 && (
        <>
          <h3 className="text-[15px] font-extrabold text-ink mb-3">🚫 Active Complaints ({openTickets.length})</h3>
          {openTickets.slice(0, 3).map(tk => (
            <div key={tk.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex gap-1.5 mb-1 flex-wrap">
                  <span className={`inline-block px-2 py-[2px] rounded-full text-[9px] font-bold uppercase ${tk.priority === "urgent" ? "bg-red-100 text-red-700" : tk.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{tk.priority}</span>
                  <span className={`inline-block px-2 py-[2px] rounded-full text-[9px] font-bold ${tk.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{tk.status.replace("_", " ")}</span>
                </div>
                <div className="text-sm font-bold text-ink">{tk.subject}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">{tk.category} · {new Date(tk.created_at).toLocaleDateString("en-IN")}</div>
                {tk.status === "in_progress" && (
                  <div className="text-[10px] text-yellow-700 mt-1 font-semibold">🔧 Being worked on</div>
                )}
              </div>
              {tk.status === "open" && (
                <button onClick={() => cancelTicket(tk.id)} className="px-2.5 py-1 rounded-lg border border-red-200 text-[10px] font-semibold text-red-400 cursor-pointer flex-shrink-0">Cancel</button>
              )}
            </div>
          ))}
          {openTickets.length > 3 && (
            <a href="/tenant/complaints" className="block text-center text-xs text-brand-500 font-semibold mt-1 mb-3">View all complaints →</a>
          )}
        </>
      )}

      {/* Receipt Modal */}
      {showReceipt && myPayment && profile && flat && (
        <ReceiptModal
          payment={myPayment}
          tenant={{ full_name: tenantUser?.full_name ?? user?.name ?? "Tenant" }}
          flat={{ flat_number: flat.flat_number, block: flat.block }}
          landlord={(flat.owner as { full_name: string } | null)?.full_name}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Pay Rent Modal */}
      {showPayModal && profile && (
        <PayRentModal
          tenantId={profile.id}
          monthYear={currentMonth}
          amount={flat?.monthly_rent ?? myPayment?.expected_amount ?? 0}
          existingPaymentId={myPayment?.id ?? null}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => { setShowPayModal(false); reloadPayments(); }}
        />
      )}
    </div>
  );
}
