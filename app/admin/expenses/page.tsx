"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_EXPENSES } from "@/lib/mockData";

const EXPENSE_SUMMARY = [
  { cat: "electricity", icon: "⚡", total: 18500 },
  { cat: "cleaning", icon: "🧹", total: 25000 },
  { cat: "security", icon: "🛡️", total: 48000 },
  { cat: "lift_maintenance", icon: "🔧", total: 45000 },
  { cat: "plumbing", icon: "🔧", total: 12000 },
];

export default function AdminExpenses() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📋 Society Expenses</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Expense</button>
      </div>

      {/* Category Summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        {EXPENSE_SUMMARY.map((c) => (
          <div key={c.cat} className="bg-white rounded-xl p-3 border border-border-default flex-1 min-w-[120px] text-center">
            <div className="text-lg">{c.icon}</div>
            <div className="text-sm font-extrabold text-ink">{formatCurrency(c.total)}</div>
            <div className="text-[10px] text-ink-muted capitalize">{c.cat.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      {/* Expense List */}
      {MOCK_EXPENSES.map((e) => (
        <div key={e.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 mb-2 ${e.approval === "approved" ? "border-l-green-500" : "border-l-yellow-500"}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[13px] font-bold text-ink">{e.desc}</div>
              <div className="text-[11px] text-ink-muted">{e.category.replace("_", " ")} • {e.vendor} • {e.date}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold text-ink">{formatCurrency(e.amount)}</span>
              <StatusBadge status={e.approval} />
              {e.approval === "pending" && (
                <>
                  <button className="px-2 py-1 rounded-lg bg-green-600 text-white text-xs font-bold cursor-pointer">✓</button>
                  <button className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">✗</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
