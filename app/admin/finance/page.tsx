"use client";

import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_SOCIETIES, MOCK_FLATS, MOCK_USERS, MOCK_MAINT_PAYMENTS, MOCK_EXPENSES } from "@/lib/mockData";

export default function AdminFinance() {
  const society = MOCK_SOCIETIES[0];
  const totalCollected = MOCK_MAINT_PAYMENTS.filter((m) => m.status === "paid").reduce((a, m) => a + m.amount, 0);
  const totalExpected = MOCK_MAINT_PAYMENTS.reduce((a, m) => a + m.expected, 0);
  const totalExpenses = MOCK_EXPENSES.filter((e) => e.approval === "approved").reduce((a, e) => a + e.amount, 0);

  return (
    <div>
      <div className="flex gap-2.5 flex-wrap mb-5">
        <StatCard icon="💰" label="Collected (Mar)" value={formatCurrency(totalCollected)} accent="text-green-700" />
        <StatCard icon="⏳" label="Pending" value={formatCurrency(totalExpected - totalCollected)} accent="text-red-600" />
        <StatCard icon="📋" label="Expenses (Mar)" value={formatCurrency(totalExpenses)} />
        <StatCard icon="🏦" label="Net Balance" value={formatCurrency(society.balance)} accent="text-green-700" />
      </div>

      <h3 className="text-[15px] font-extrabold text-ink mb-3">Maintenance Collection — March 2026</h3>
      {MOCK_MAINT_PAYMENTS.map((mp) => {
        const flat = MOCK_FLATS.find((f) => f.id === mp.flatId);
        const payer = MOCK_USERS.find((u) => u.id === mp.payerId);
        return (
          <div key={mp.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-1.5 flex justify-between items-center ${mp.status === "paid" ? "border-l-green-500" : mp.status === "overdue" ? "border-l-red-500" : "border-l-yellow-500"}`}>
            <div>
              <div className="text-[13px] font-bold text-ink">{flat?.flatNo} — {payer?.name}</div>
              <div className="text-[11px] text-ink-muted">{formatCurrency(mp.expected)} due {mp.date ? `• Paid ${mp.date} via ${mp.method}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              {mp.status === "paid" && <span className="text-[15px] font-extrabold text-green-700">{formatCurrency(mp.amount)}</span>}
              <StatusBadge status={mp.status} />
              {mp.status !== "paid" && (
                <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold cursor-pointer">📱 Remind</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
