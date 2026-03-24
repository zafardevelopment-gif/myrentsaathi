"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantRentPayments, getTenantProfile, type TenantRentPayment } from "@/lib/tenant-data";

export default function TenantPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<TenantRentPayment[]>([]);
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const [profile, pays] = await Promise.all([
        getTenantProfile(user!.email),
        getTenantRentPayments(user!.email),
      ]);
      setMonthlyRent((profile?.flat as { monthly_rent?: number | null } | null)?.monthly_rent ?? 0);
      setPayments(pays);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const onTimeCount = payments.filter((p) => p.status === "paid").length;

  // Next month label
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthLabel = nextMonthDate.toLocaleString("en-IN", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">💰 Payment History</h2>

      {/* Summary */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-extrabold text-brand-500">{formatCurrency(totalPaid)}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">Total Paid</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-green-700">{onTimeCount} / {payments.length}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">On-Time</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-ink">₹0</div>
            <div className="text-[10px] text-ink-muted mt-0.5">Late Fees</div>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No payment history yet.</div>
      ) : (
        payments.map((p) => {
          const isOnTime = p.status === "paid";
          return (
            <div key={p.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isOnTime ? "bg-green-50" : "bg-yellow-50"}`}>
                  {isOnTime ? "✅" : "⚠️"}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">
                    {new Date(p.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {p.payment_date ? `Paid ${p.payment_date}` : "—"}
                    {p.payment_method ? ` · ${p.payment_method}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-extrabold text-ink">{formatCurrency(p.status === "paid" ? p.amount : p.expected_amount)}</span>
                <StatusBadge status={isOnTime ? "paid" : p.status} />
              </div>
            </div>
          );
        })
      )}

      {/* Pay next month */}
      {monthlyRent > 0 && (
        <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-[14px] p-4 border border-brand-100 mt-4">
          <div className="text-sm font-extrabold text-brand-600 mb-1">{nextMonthLabel} Rent</div>
          <div className="text-xs text-ink-muted mb-3">Due on 5th · {formatCurrency(monthlyRent)}</div>
          <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            Pay Early →
          </button>
        </div>
      )}
    </div>
  );
}
