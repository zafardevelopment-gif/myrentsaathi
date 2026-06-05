"use client";

import { supabase } from "@/lib/supabase";
import PaymentModal, { type PaymentTarget } from "@/components/payments/PaymentModal";

type Props = {
  tenantId: string;
  monthYear: string; // "YYYY-MM"
  amount: number;          // full expected amount
  alreadyPaid?: number;    // how much has already been paid (for partial carry-overs)
  existingPaymentId?: string | null;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Tenant rent payment. Thin wrapper around the shared PaymentModal — keeps the
 * existing call sites (tenant dashboard + payments page) unchanged while the
 * Gateway / Receipt / Partial UI lives in one place.
 */
export default function PayRentModal({
  tenantId, monthYear, amount, alreadyPaid = 0, existingPaymentId,
  userName, userEmail, userPhone, onClose, onSuccess,
}: Props) {
  const monthLabel = new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });

  const target: PaymentTarget = {
    kind: "rent",
    storagePrefix: `receipts/${tenantId}`,
    existingPaymentId: existingPaymentId ?? null,
    orderFields: { tenantId, monthYear },
    verifyFields: { tenantId, monthYear },
    saveManual: async ({ paidNow, isPartial, receiptUrl, receiptName }) => {
      const totalPaid = (alreadyPaid || 0) + paidNow;
      if (existingPaymentId) {
        const { error } = await supabase.from("rent_payments").update({
          receipt_url: receiptUrl,
          receipt_name: receiptName,
          receipt_status: "pending_verification",
          paid_amount: totalPaid,
        }).eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rent_payments").insert({
          tenant_id: tenantId,
          month_year: monthYear,
          expected_amount: amount,
          amount: isPartial ? paidNow : amount,
          status: "pending",
          receipt_url: receiptUrl,
          receipt_name: receiptName,
          receipt_status: "pending_verification",
          paid_amount: totalPaid,
        });
        if (error) throw error;
      }
    },
  };

  return (
    <PaymentModal
      title="Pay Rent"
      periodLabel={monthLabel}
      amount={amount}
      alreadyPaid={alreadyPaid}
      target={target}
      userName={userName}
      userEmail={userEmail}
      userPhone={userPhone}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
