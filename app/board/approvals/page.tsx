"use client";

import { MOCK_EXPENSES } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import StatusBadge from "@/components/dashboard/StatusBadge";

const CATEGORY_ICON: Record<string, string> = {
  electricity: "⚡",
  cleaning: "🧹",
  lift_maintenance: "🔧",
  security: "🛡️",
  plumbing: "🔧",
};

export default function BoardApprovals() {
  const pendingExp = MOCK_EXPENSES.filter((e) => e.approval === "pending");
  const approvedExp = MOCK_EXPENSES.filter((e) => e.approval === "approved");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📋 Expense Approvals</h2>
      </div>

      {/* Summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-yellow-600">{pendingExp.length}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Pending Review</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{approvedExp.length}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Approved</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-ink">
            {formatCurrency(pendingExp.reduce((a, e) => a + e.amount, 0))}
          </div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Pending Amount</div>
        </div>
      </div>

      {pendingExp.length === 0 && (
        <div className="text-center py-10 text-ink-muted text-sm">All caught up! No pending approvals ✨</div>
      )}

      {pendingExp.length > 0 && (
        <>
          <h3 className="text-[13px] font-bold text-ink mb-2.5">⏳ Awaiting Approval</h3>
          {pendingExp.map((e) => (
            <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default border-l-4 border-l-yellow-500 mb-2">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-xl flex-shrink-0">{CATEGORY_ICON[e.category] || "📋"}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{e.desc}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{e.vendor} · {e.date}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-extrabold text-ink">{formatCurrency(e.amount)}</div>
                  <StatusBadge status="pending" />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold cursor-pointer">✓ Approve</button>
                <button className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold cursor-pointer">✗ Reject</button>
                <button className="px-4 py-2 rounded-xl bg-white border border-border-default text-xs font-semibold text-ink-muted cursor-pointer">View Bill</button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="text-[13px] font-bold text-ink mt-5 mb-2.5">✅ Recently Approved</h3>
      {approvedExp.map((e) => (
        <div key={e.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-1.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">{CATEGORY_ICON[e.category] || "📋"}</span>
            <div>
              <div className="text-sm font-bold text-ink">{e.desc}</div>
              <div className="text-[11px] text-ink-muted">{e.vendor} · {e.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-extrabold text-ink">{formatCurrency(e.amount)}</span>
            <StatusBadge status="approved" />
          </div>
        </div>
      ))}
    </div>
  );
}
