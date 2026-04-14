"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantRentPayments, getTenantProfile, type TenantRentPayment } from "@/lib/tenant-data";
import { supabase } from "@/lib/supabase";
import PayRentModal from "@/components/tenant/PayRentModal";
import ReceiptModal from "@/components/tenant/ReceiptModal";
import toast, { Toaster } from "react-hot-toast";

function receiptStatusBadge(status: string | null | undefined) {
  if (status === "pending_verification")
    return <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">🕐 Verifying</span>;
  if (status === "accepted")
    return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">✓ Verified</span>;
  if (status === "rejected")
    return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">✗ Rejected</span>;
  return null;
}

export default function TenantPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<TenantRentPayment[]>([]);
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<{ monthYear: string; amount: number; paymentId?: string; alreadyPaid?: number } | null>(null);
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
  const pendingVerification = payments.filter(p => p.receipt_status === "pending_verification").length;

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

      {/* Pending verification banner */}
      {pendingVerification > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-3.5 mb-4 flex items-center gap-2.5">
          <span className="text-xl">🕐</span>
          <div>
            <div className="text-sm font-bold text-yellow-800">
              {pendingVerification} receipt{pendingVerification > 1 ? "s" : ""} awaiting verification
            </div>
            <div className="text-[11px] text-yellow-600">Your landlord will review and confirm soon.</div>
          </div>
        </div>
      )}

      {/* Current month card */}
      {currentPayment && currentPayment.status !== "paid" && tenantId && (
        <div className={`rounded-[14px] p-4 border mb-4 ${
          currentPayment.receipt_status === "pending_verification"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-red-50 border-red-100"
        }`}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className={`text-sm font-extrabold ${currentPayment.receipt_status === "pending_verification" ? "text-yellow-700" : "text-red-700"}`}>
                {new Date(currentMonth + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
                {" — "}{currentPayment.status === "overdue" ? "Overdue" : "Pending"}
              </div>
              {/* Progress bar for partial payments */}
              {currentPayment.paid_amount && currentPayment.paid_amount > 0 ? (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-ink-muted">Paid: {formatCurrency(currentPayment.paid_amount)}</span>
                    <span className="text-red-600 font-bold">Remaining: {formatCurrency(currentPayment.expected_amount - currentPayment.paid_amount)}</span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (currentPayment.paid_amount / currentPayment.expected_amount) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-ink-muted mt-0.5">{formatCurrency(currentPayment.expected_amount)} due</div>
              )}
              {currentPayment.receipt_status && (
                <div className="mt-1.5">{receiptStatusBadge(currentPayment.receipt_status)}</div>
              )}
            </div>
            {currentPayment.receipt_status !== "pending_verification" && (
              <button
                onClick={() => setPayModal({
                  monthYear: currentMonth,
                  amount: currentPayment.expected_amount,
                  paymentId: currentPayment.id,
                  alreadyPaid: currentPayment.paid_amount ?? 0,
                })}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer flex-shrink-0"
              >
                Pay Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* No current month row yet but rent is set */}
      {!currentPayment && monthlyRent > 0 && tenantId && (
        <div className="bg-red-50 rounded-[14px] p-4 border border-red-100 mb-4 flex justify-between items-center gap-3">
          <div>
            <div className="text-sm font-extrabold text-red-700">
              {new Date(currentMonth + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })} — Pending
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{formatCurrency(monthlyRent)} due</div>
          </div>
          <button
            onClick={() => setPayModal({ monthYear: currentMonth, amount: monthlyRent })}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer flex-shrink-0"
          >Pay Now</button>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No payment history yet.</div>
      ) : (
        payments.map(p => {
          const isPaid = p.status === "paid";
          const hasReceipt = !!p.receipt_url;
          const remaining = p.expected_amount - (p.paid_amount ?? 0);
          const partialPct = p.paid_amount && p.paid_amount > 0
            ? Math.min(100, (p.paid_amount / p.expected_amount) * 100)
            : null;

          return (
            <div key={p.id} className={`bg-white rounded-[14px] p-4 border mb-2 ${
              p.receipt_status === "pending_verification" ? "border-yellow-200" :
              p.receipt_status === "rejected" ? "border-red-300" :
              isPaid ? "border-green-200" : "border-border-default"
            }`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    isPaid ? "bg-green-50" :
                    p.receipt_status === "pending_verification" ? "bg-yellow-50" :
                    p.receipt_status === "rejected" ? "bg-red-50" : "bg-yellow-50"
                  }`}>
                    {isPaid ? "✅" : p.receipt_status === "pending_verification" ? "🕐" : p.receipt_status === "rejected" ? "❌" : "⚠️"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">
                      {new Date(p.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
                    </div>
                    {isPaid ? (
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {p.payment_date ? `Paid ${new Date(p.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : "—"}
                        {p.payment_method ? ` · ${p.payment_method}` : ""}
                      </div>
                    ) : (
                      <div className="mt-1">
                        {receiptStatusBadge(p.receipt_status)}
                        {p.receipt_status === "rejected" && (
                          <div className="text-[10px] text-red-600 mt-0.5">Receipt rejected — please re-upload</div>
                        )}
                      </div>
                    )}

                    {/* Partial payment progress */}
                    {!isPaid && partialPct !== null && (
                      <div className="mt-2 w-40">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-green-600">{formatCurrency(p.paid_amount ?? 0)} paid</span>
                          <span className="text-red-500">{formatCurrency(remaining)} left</span>
                        </div>
                        <div className="w-full bg-warm-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${partialPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-sm font-extrabold text-ink">
                    {formatCurrency(isPaid ? p.amount : p.expected_amount)}
                  </span>
                  {!isPaid && p.paid_amount && p.paid_amount > 0 && (
                    <span className="text-[10px] text-red-500 font-bold">{formatCurrency(remaining)} left</span>
                  )}
                  {isPaid && (
                    <button onClick={() => setReceiptPayment(p)}
                      className="px-2.5 py-1 rounded-lg border border-green-200 text-green-700 text-[10px] font-bold cursor-pointer">
                      Receipt
                    </button>
                  )}
                  {!isPaid && tenantId && p.receipt_status !== "pending_verification" && (
                    <button
                      onClick={() => setPayModal({
                        monthYear: p.month_year,
                        amount: p.expected_amount,
                        paymentId: p.id,
                        alreadyPaid: p.paid_amount ?? 0,
                      })}
                      className={`px-2.5 py-1 rounded-lg text-white text-[10px] font-bold cursor-pointer ${
                        p.receipt_status === "rejected" ? "bg-red-500" : "bg-brand-500"
                      }`}
                    >
                      {p.receipt_status === "rejected" ? "Re-upload" : "Pay"}
                    </button>
                  )}
                  {hasReceipt && p.receipt_status === "pending_verification" && (
                    <a href={p.receipt_url!} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-yellow-200 text-yellow-700 text-[10px] font-bold cursor-pointer">
                      View
                    </a>
                  )}
                </div>
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
          alreadyPaid={payModal.alreadyPaid ?? 0}
          existingPaymentId={payModal.paymentId ?? null}
          userName={user?.name}
          userEmail={user?.email}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
