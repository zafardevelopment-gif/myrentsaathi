"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type Props = {
  tenantId: string;
  monthYear: string; // "YYYY-MM"
  amount: number;
  existingPaymentId?: string | null;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
};

// Extend window to include Razorpay

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PayRentModal({
  tenantId, monthYear, amount, existingPaymentId,
  userName, userEmail, userPhone, onClose, onSuccess,
}: Props) {
  const [paying, setPaying] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const monthLabel = new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  async function handleRazorpayPay() {
    if (!scriptReady) {
      toast.error("Payment gateway not loaded. Please try again.");
      return;
    }
    setPaying(true);
    try {
      // Step 1: Create order on server
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          tenantId,
          monthYear,
          type: "rent",
          description: `Rent for ${monthLabel}`,
        }),
      });
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!orderRes.ok || orderData.error) {
        throw new Error(orderData.error ?? "Failed to create payment order");
      }

      // Step 2: Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderData.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
          amount: orderData.amount!,
          currency: orderData.currency ?? "INR",
          name: "MyRentSaathi",
          description: `Rent — ${monthLabel}`,
          order_id: orderData.orderId!,
          prefill: { name: userName, email: userEmail, contact: userPhone },
          theme: { color: "#6366f1" },
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              // Step 3: Verify on server and update DB
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  type: "rent",
                  tenantId,
                  monthYear,
                  amount,
                  existingPaymentId: existingPaymentId ?? undefined,
                }),
              });
              const verifyData = await verifyRes.json() as { success?: boolean; error?: string };
              if (!verifyRes.ok || verifyData.error) {
                throw new Error(verifyData.error ?? "Payment verification failed");
              }
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });

      toast.success("Payment successful! ✓");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== "Payment cancelled") {
        toast.error(msg);
      }
    } finally {
      setPaying(false);
    }
  }

  const razorpayConfigured = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-base font-extrabold text-ink">💰 Pay Rent</div>
          <button onClick={onClose} className="text-ink-muted text-lg cursor-pointer">✕</button>
        </div>

        {/* Amount */}
        <div className="bg-brand-50 rounded-[14px] p-5 mb-5 text-center">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">{monthLabel} Rent</div>
          <div className="text-3xl font-extrabold text-brand-600">{formatCurrency(amount)}</div>
          <div className="text-xs text-ink-muted mt-1">Secure payment via Razorpay</div>
        </div>

        {/* What you'll pay */}
        <div className="bg-warm-50 rounded-[14px] p-3.5 mb-4 space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Rent amount</span>
            <span className="font-bold text-ink">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Platform fee</span>
            <span className="font-bold text-green-600">FREE</span>
          </div>
          <div className="border-t border-border-default pt-1.5 flex justify-between items-center">
            <span className="font-bold text-ink">Total</span>
            <span className="font-extrabold text-brand-600">{formatCurrency(amount)}</span>
          </div>
        </div>

        {/* Pay methods note */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {["UPI", "Cards", "Net Banking", "Wallets"].map(m => (
            <span key={m} className="px-2 py-1 bg-warm-100 rounded-lg text-[10px] font-semibold text-ink-muted">{m}</span>
          ))}
        </div>

        {!razorpayConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700 mb-4">
            ⚠️ Razorpay not configured. Add <code>NEXT_PUBLIC_RAZORPAY_KEY_ID</code> to .env.local to enable payments.
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleRazorpayPay}
            disabled={paying || !scriptReady}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {paying ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
            ) : !scriptReady ? (
              "Loading…"
            ) : (
              `Pay ${formatCurrency(amount)}`
            )}
          </button>
        </div>

        <div className="text-center text-[10px] text-ink-muted mt-3">
          🔒 Secured by Razorpay · PCI-DSS compliant
        </div>
      </div>
    </div>
  );
}
