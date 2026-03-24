"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getTenantProfile,
  getTenantRentPayments,
  getTenantNotices,
  type TenantProfile,
  type TenantRentPayment,
  type TenantNotice,
} from "@/lib/tenant-data";

export default function TenantHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [payments, setPayments] = useState<TenantRentPayment[]>([]);
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const p = await getTenantProfile(user!.email);
      setProfile(p);
      if (p) {
        const [pay, not] = await Promise.all([
          getTenantRentPayments(user!.email).catch(() => []),
          p.society_id ? getTenantNotices(p.society_id).catch(() => []) : Promise.resolve([]),
        ]);
        setPayments(pay);
        setNotices(not);
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

  return (
    <div>
      {/* Hero card */}
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
            <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">Get Receipt</button>
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
            <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer">Pay Now</button>
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
    </div>
  );
}
