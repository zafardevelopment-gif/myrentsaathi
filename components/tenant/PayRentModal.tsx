"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Props = {
  tenantId: string;
  monthYear: string; // "YYYY-MM"
  amount: number;
  existingPaymentId?: string | null; // if rent_payment record already exists
  onClose: () => void;
  onSuccess: () => void;
};

const METHODS = [
  { value: "cash", label: "💵 Cash", desc: "Hand over cash to landlord" },
  { value: "upi", label: "📱 UPI", desc: "GPay, PhonePe, Paytm, etc." },
  { value: "bank_transfer", label: "🏦 Bank Transfer", desc: "NEFT / IMPS / RTGS" },
  { value: "cheque", label: "📝 Cheque", desc: "Hand over cheque to landlord" },
];

export default function PayRentModal({ tenantId, monthYear, amount, existingPaymentId, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState("upi");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });

  async function handlePay() {
    setSaving(true);
    let error;
    if (existingPaymentId) {
      // Update existing record
      ({ error } = await supabase.from("rent_payments").update({
        status: "paid",
        amount,
        payment_date: today,
        payment_method: method,
      }).eq("id", existingPaymentId));
    } else {
      // Insert new record
      ({ error } = await supabase.from("rent_payments").insert({
        tenant_id: tenantId,
        month_year: monthYear,
        amount,
        expected_amount: amount,
        status: "paid",
        payment_date: today,
        payment_method: method,
      }));
    }
    setSaving(false);
    if (error) { toast.error("Payment failed: " + error.message); return; }
    toast.success("Payment recorded successfully!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-base font-extrabold text-ink">💰 Pay Rent</div>
          <button onClick={onClose} className="text-ink-muted text-lg cursor-pointer">✕</button>
        </div>

        {/* Amount */}
        <div className="bg-brand-50 rounded-[14px] p-4 mb-4 text-center">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">{monthLabel} Rent</div>
          <div className="text-3xl font-extrabold text-brand-600">{formatCurrency(amount)}</div>
          <div className="text-xs text-ink-muted mt-1">Due date: 5th of the month</div>
        </div>

        {/* Payment method */}
        <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Select Payment Method</div>
        <div className="space-y-2 mb-5">
          {METHODS.map(m => (
            <button key={m.value} onClick={() => setMethod(m.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${method === m.value ? "border-brand-500 bg-brand-50" : "border-border-default bg-white"}`}>
              <span className="text-xl">{m.label.split(" ")[0]}</span>
              <div className="flex-1">
                <div className={`text-sm font-bold ${method === m.value ? "text-brand-600" : "text-ink"}`}>{m.label.split(" ").slice(1).join(" ")}</div>
                <div className="text-[10px] text-ink-muted">{m.desc}</div>
              </div>
              {method === m.value && <span className="text-brand-500 text-lg">✓</span>}
            </button>
          ))}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700 mb-4">
          ⚠️ This records the payment manually. No actual money transfer happens here.
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Cancel</button>
          <button onClick={handlePay} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Recording..." : `Confirm Payment`}
          </button>
        </div>
      </div>
    </div>
  );
}
