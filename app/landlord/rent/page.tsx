"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_RENT_PAYMENTS, MOCK_USERS } from "@/lib/mockData";

export default function LandlordRent() {
  const totalExpected = MOCK_RENT_PAYMENTS.reduce((a, r) => a + r.expected, 0);
  const totalPaid = MOCK_RENT_PAYMENTS.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">💰 Rent Collection — March 2026</h2>
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

      {MOCK_RENT_PAYMENTS.map((rp) => {
        const initials = rp.tenantName.split(" ").map((n: string) => n[0]).join("");
        return (
          <div key={rp.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-extrabold text-brand-500">
                {initials}
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{rp.tenantName}</div>
                <div className="text-[11px] text-ink-muted">
                  Flat {rp.flatNo} · {formatCurrency(rp.expected)}/mo
                  {rp.date ? ` · Paid ${rp.date}` : ""}
                  {rp.method ? ` via ${rp.method}` : ""}
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
      })}
    </div>
  );
}
