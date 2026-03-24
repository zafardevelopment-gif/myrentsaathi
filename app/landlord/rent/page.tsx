"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordRentPayments, type LandlordRentPayment } from "@/lib/landlord-data";

export default function LandlordRent() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<LandlordRentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    getLandlordRentPayments(user.email)
      .then(setPayments)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  const totalExpected = payments.reduce((a, r) => a + r.expected_amount, 0);
  const totalPaid = payments.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
  const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">💰 Rent Collection — {currentMonthLabel}</h2>
        <button className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold cursor-pointer">📱 Remind All</button>
      </div>

      {/* Summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-ink">{formatCurrency(totalExpected)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Total Expected</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Collected</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-red-600">{formatCurrency(totalExpected - totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Overdue</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">
          No rent payments this month. Seed the database first.
        </div>
      ) : (
        payments.map((rp) => {
          const tenantName = (rp.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant";
          const flat = (rp.flat as { flat_number: string; block: string | null } | null);
          const initials = tenantName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
          return (
            <div key={rp.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-extrabold text-brand-500">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{tenantName}</div>
                  <div className="text-[11px] text-ink-muted">
                    {flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—"}
                    {" · "}{formatCurrency(rp.expected_amount)}/mo
                    {rp.payment_date ? ` · Paid ${rp.payment_date}` : ""}
                    {rp.payment_method ? ` via ${rp.payment_method}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {rp.status === "paid" && (
                  <span className="text-sm font-extrabold text-green-700">{formatCurrency(rp.amount)}</span>
                )}
                <StatusBadge status={rp.status} />
                {rp.status !== "paid" && (
                  <button className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold cursor-pointer">
                    Remind
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
