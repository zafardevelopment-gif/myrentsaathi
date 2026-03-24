"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordMaintenancePayments, type LandlordMaintenancePayment } from "@/lib/landlord-data";

export default function LandlordSocietyDues() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<LandlordMaintenancePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    getLandlordMaintenancePayments(user.email)
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const totalPaid = payments.filter((m) => m.status === "paid").reduce((a, m) => a + (m.amount || 0), 0);
  const totalDue = payments.filter((m) => m.status !== "paid").reduce((a, m) => a + (m.expected_amount || 0), 0);

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🏢 Society Dues</h2>

      <div className="flex gap-2.5 flex-wrap mb-5">
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Total Paid</div>
        </div>
        <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[120px]">
          <div className="text-xl font-extrabold text-red-600">{formatCurrency(totalDue)}</div>
          <div className="text-[11px] text-ink-muted font-semibold mt-0.5">Still Pending</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No maintenance payments found.</div>
      ) : (
        payments.map((mp) => {
          const flat = mp.flat as { flat_number: string; block: string | null } | null;
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
          return (
            <div key={mp.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div>
                <div className="text-sm font-bold text-ink">{flatLabel} — Monthly Maintenance</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {formatCurrency(mp.expected_amount)} · {mp.month_year}
                  {mp.payment_date ? ` · Paid ${new Date(mp.payment_date).toLocaleDateString("en-IN")} via ${mp.payment_method ?? "—"}` : ""}
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
        })
      )}
    </div>
  );
}
