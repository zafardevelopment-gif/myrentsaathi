"use client";

import { formatCurrency } from "@/lib/utils";

type Props = {
  payment: {
    amount: number;
    month_year: string;
    payment_date: string | null;
    payment_method: string | null;
  };
  tenant: { full_name: string; email?: string };
  flat: { flat_number: string; block?: string | null };
  landlord?: string;
  onClose: () => void;
};

export default function ReceiptModal({ payment, tenant, flat, landlord, onClose }: Props) {
  const monthLabel = new Date(payment.month_year + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
  const receiptNo = `RCP-${payment.month_year.replace("-", "")}-${flat.flat_number.replace(/\s/g, "")}`;
  const flatLabel = `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}`;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Receipt content */}
        <div id="receipt-content" className="p-6">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="text-xl font-extrabold text-brand-600">MyRentSaathi</div>
            <div className="text-xs text-ink-muted mt-0.5">Rent Payment Receipt</div>
          </div>

          <div className="border-t border-dashed border-border-default my-4" />

          {/* Receipt info */}
          <div className="space-y-3">
            {[
              { label: "Receipt No.", value: receiptNo },
              { label: "Date", value: payment.payment_date ?? new Date().toLocaleDateString("en-IN") },
              { label: "Month", value: monthLabel },
              { label: "Tenant", value: tenant.full_name },
              { label: "Flat", value: flatLabel },
              ...(landlord ? [{ label: "Landlord", value: landlord }] : []),
              { label: "Payment Method", value: payment.payment_method?.toUpperCase() ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-ink-muted">{row.label}</span>
                <span className="text-xs font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border-default my-4" />

          {/* Amount */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-ink">Amount Paid</span>
            <span className="text-xl font-extrabold text-green-700">{formatCurrency(payment.amount)}</span>
          </div>

          <div className="bg-green-50 rounded-xl p-3 mt-4 text-center">
            <div className="text-xs font-bold text-green-700">✅ Payment Confirmed</div>
            <div className="text-[10px] text-ink-muted mt-0.5">This is a digitally generated receipt</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
          <button onClick={handlePrint} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">🖨️ Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}
