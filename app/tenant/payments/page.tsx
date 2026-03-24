"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantRentPayments, getTenantProfile, type TenantRentPayment } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";
import PayRentModal from "@/components/tenant/PayRentModal";
import ReceiptModal from "@/components/tenant/ReceiptModal";
import toast, { Toaster } from "react-hot-toast";

export default function TenantPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<TenantRentPayment[]>([]);
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<{ monthYear: string; amount: number; paymentId?: string } | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<TenantRentPayment | null>(null);
  const [tenantProfile, setTenantProfile] = useState<{ user?: { full_name: string } | null; flat?: { flat_number: string; block?: string | null } | null } | null>(null);

  async function loadData() {
    if (!user?.email) return;
    const [profile, pays] = await Promise.all([
      getTenantProfile(user.email),
      getTenantRentPayments(user.email),
    ]);
    setMonthlyRent((profile?.flat as { monthly_rent?: number | null } | null)?.monthly_rent ?? 0);
    setTenantId(profile?.id ?? null);
    setTenantProfile(profile as typeof tenantProfile);
    setPayments(pays);
  }

  useEffect(() => {
    loadData().catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentPayment = payments.find(p => p.month_year === currentMonth);
  const totalPaid = payments.filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const onTimeCount = payments.filter(p => p.status === "paid").length;

  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonth = nextMonthDate.toISOString().slice(0, 7);
  const nextMonthLabel = nextMonthDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const nextMonthPayment = payments.find(p => p.month_year === nextMonth);

  if (loading) {
    return <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <h2 className="text-[15px] font-extrabold text-ink mb-4">💰 Payment History</h2>

      {/* Summary */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
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

      {/* Current month pending */}
      {currentPayment && currentPayment.status !== "paid" && tenantId && (
        <div className="bg-red-50 rounded-[14px] p-4 border border-red-100 mb-4 flex justify-between items-center gap-3">
          <div>
            <div className="text-sm font-extrabold text-red-700">
              {new Date(currentMonth + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })} — {currentPayment.status === "overdue" ? "Overdue" : "Pending"}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{formatCurrency(currentPayment.expected_amount)} due</div>
          </div>
          <button onClick={() => setPayModal({ monthYear: currentMonth, amount: currentPayment.expected_amount, paymentId: currentPayment.id })}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer flex-shrink-0">Pay Now</button>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No payment history yet.</div>
      ) : (
        payments.map(p => {
          const isPaid = p.status === "paid";
          return (
            <div key={p.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isPaid ? "bg-green-50" : "bg-yellow-50"}`}>
                  {isPaid ? "✅" : "⚠️"}
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
                <span className="text-sm font-extrabold text-ink">{formatCurrency(isPaid ? p.amount : p.expected_amount)}</span>
                <StatusBadge status={isPaid ? "paid" : p.status} />
                {isPaid && (
                  <button onClick={() => setReceiptPayment(p)}
                    className="px-2.5 py-1 rounded-lg border border-green-200 text-green-700 text-[10px] font-bold cursor-pointer">Receipt</button>
                )}
                {!isPaid && tenantId && (
                  <button onClick={() => setPayModal({ monthYear: p.month_year, amount: p.expected_amount, paymentId: p.id })}
                    className="px-2.5 py-1 rounded-lg bg-brand-500 text-white text-[10px] font-bold cursor-pointer">Pay</button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Pay next month early */}
      {monthlyRent > 0 && tenantId && !nextMonthPayment && (
        <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-[14px] p-4 border border-brand-100 mt-4">
          <div className="text-sm font-extrabold text-brand-600 mb-1">{nextMonthLabel} Rent</div>
          <div className="text-xs text-ink-muted mb-3">Due on 5th · {formatCurrency(monthlyRent)}</div>
          <button onClick={() => setPayModal({ monthYear: nextMonth, amount: monthlyRent })}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            Pay Early →
          </button>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptPayment && tenantProfile && (
        <ReceiptModal
          payment={receiptPayment}
          tenant={{ full_name: (tenantProfile.user as { full_name: string } | null)?.full_name ?? "Tenant" }}
          flat={{ flat_number: (tenantProfile.flat as { flat_number: string; block?: string | null } | null)?.flat_number ?? "—", block: (tenantProfile.flat as { flat_number: string; block?: string | null } | null)?.block }}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* Pay Modal */}
      {payModal && tenantId && (
        <PayRentModal
          tenantId={tenantId}
          monthYear={payModal.monthYear}
          amount={payModal.amount}
          existingPaymentId={payModal.paymentId ?? null}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
