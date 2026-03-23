"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";

const PAY_HISTORY = [
  { month: "March 2026", amount: 25000, date: "1 Mar", status: "paid", method: "UPI", onTime: true },
  { month: "February 2026", amount: 25000, date: "2 Feb", status: "paid", method: "UPI", onTime: true },
  { month: "January 2026", amount: 25000, date: "3 Jan", status: "paid", method: "Bank Transfer", onTime: true },
  { month: "December 2025", amount: 25000, date: "1 Dec", status: "paid", method: "UPI", onTime: true },
  { month: "November 2025", amount: 25000, date: "5 Nov", status: "late", method: "UPI", onTime: false },
];

export default function TenantPayments() {
  const totalPaid = PAY_HISTORY.reduce((a, p) => a + p.amount, 0);
  const onTimeCount = PAY_HISTORY.filter((p) => p.onTime).length;

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
            <div className="text-xl font-extrabold text-green-700">{onTimeCount} / {PAY_HISTORY.length}</div>
            <div className="text-[10px] text-ink-muted mt-0.5">On-Time</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-ink">₹0</div>
            <div className="text-[10px] text-ink-muted mt-0.5">Late Fees</div>
          </div>
        </div>
      </div>

      {/* Payment list */}
      {PAY_HISTORY.map((p, i) => (
        <div key={i} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${p.onTime ? "bg-green-50" : "bg-yellow-50"}`}>
              {p.onTime ? "✅" : "⚠️"}
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{p.month}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">Paid {p.date} · {p.method}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-extrabold text-ink">{formatCurrency(p.amount)}</span>
            <StatusBadge status={p.onTime ? "paid" : "late"} />
          </div>
        </div>
      ))}

      {/* Pay next month */}
      <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-[14px] p-4 border border-brand-100 mt-4">
        <div className="text-sm font-extrabold text-brand-600 mb-1">April 2026 Rent</div>
        <div className="text-xs text-ink-muted mb-3">Due on 5th April 2026 · ₹25,000</div>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          Pay Early →
        </button>
      </div>
    </div>
  );
}
