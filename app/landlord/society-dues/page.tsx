"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_MAINT_PAYMENTS, MOCK_FLATS } from "@/lib/mockData";

export default function LandlordSocietyDues() {
  const myPayments = MOCK_MAINT_PAYMENTS.filter((mp) =>
    ["U2", "U3"].includes(mp.payerId)
  );

  const totalPaid = myPayments.filter((m) => m.status === "paid").reduce((a, m) => a + m.amount, 0);
  const totalDue = myPayments.filter((m) => m.status !== "paid").reduce((a, m) => a + m.expected, 0);

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🏢 Society Dues</h2>

      {/* Summary */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Paid This Month</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-red-600">{formatCurrency(totalDue)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Still Pending</div>
        </div>
      </div>

      {myPayments.map((mp) => {
        const flat = MOCK_FLATS.find((f) => f.id === mp.flatId);
        return (
          <div key={mp.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
            <div>
              <div className="text-sm font-bold text-ink">Flat {flat?.flatNo} — Monthly Maintenance</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                {formatCurrency(mp.expected)} · Mar 2026
                {mp.date ? ` · Paid ${mp.date} via ${mp.method}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={mp.status} />
              {mp.status !== "paid" && (
                <button className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer">
                  Pay Now
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
