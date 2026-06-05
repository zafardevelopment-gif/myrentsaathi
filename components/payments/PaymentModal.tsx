"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

/**
 * Unified payment modal used for BOTH tenant rent and landlord maintenance/society-dues.
 * Offers three ways to pay, and records the outcome so status updates correctly:
 *   - Gateway   → Razorpay; full OR partial. On success → paid / partial-paid.
 *   - Receipt   → upload offline proof (bank/cash/UPI) → pending verification.
 *   - Partial   → pay a chosen portion now (gateway or receipt), rest carries over.
 *
 * Persistence differs per kind, so the caller supplies a `target` describing
 * which table/columns to write and what the verify route expects.
 */

export type PaymentTarget = {
  /** "rent" → rent_payments + verify type:"rent"; "maintenance" → society_due_payments + verify type:"maintenance" */
  kind: "rent" | "maintenance";
  /** Storage bucket + path prefix for receipt uploads, e.g. `receipts/<tenantId>` */
  storagePrefix: string;
  /** Existing payment row id to update (null = insert a new row) */
  existingPaymentId?: string | null;
  /** Extra body fields passed to /api/payment/create-order */
  orderFields: Record<string, unknown>;
  /** Extra body fields passed to /api/payment/verify */
  verifyFields: Record<string, unknown>;
  /**
   * Persist a manual (receipt / offline) payment of `paidNow` rupees.
   * `isPartial` = paidNow < remaining. Receipt may be null for cash w/o proof.
   */
  saveManual: (args: {
    paidNow: number;
    isPartial: boolean;
    receiptUrl: string | null;
    receiptName: string | null;
  }) => Promise<void>;
};

type Props = {
  title: string;            // e.g. "Pay Rent" / "Pay Maintenance"
  periodLabel: string;      // e.g. "July 2026" / "Electricity — Flat A-101"
  amount: number;           // full expected amount
  alreadyPaid?: number;     // already paid (partial carry-over)
  target: PaymentTarget;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
};

type PayMode = "choose" | "gateway" | "manual" | "partial";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({
  title, periodLabel, amount, alreadyPaid = 0, target,
  userName, userEmail, userPhone, onClose, onSuccess,
}: Props) {
  const [mode, setMode] = useState<PayMode>("choose");
  const [paying, setPaying] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Partial payment
  const [partialAmount, setPartialAmount] = useState("");
  // Within partial mode, choose how to pay the chosen portion
  const [partialMethod, setPartialMethod] = useState<"gateway" | "receipt">("gateway");

  const remaining = Math.max(0, amount - alreadyPaid);
  const razorpayConfigured = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  async function uploadReceipt(suffix = ""): Promise<{ url: string; name: string } | null> {
    if (!receiptFile) return null;
    const ext = receiptFile.name.split(".").pop() ?? "jpg";
    const path = `${target.storagePrefix}/${suffix}${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, receiptFile, { upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
    return { url: urlData.publicUrl, name: receiptFile.name };
  }

  // ── Gateway Payment (full or partial) ─────────────────────────
  async function handleRazorpayPay(payAmt: number) {
    if (!scriptReady) { toast.error("Payment gateway not loaded. Please try again."); return; }
    if (payAmt <= 0) { toast.error("Enter a valid amount."); return; }
    setPaying(true);
    try {
      const isPartial = payAmt < remaining;
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmt,
          type: target.kind,
          description: `${title} — ${periodLabel}`,
          ...target.orderFields,
        }),
      });
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!orderRes.ok || orderData.error) throw new Error(orderData.error ?? "Failed to create payment order");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderData.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
          amount: orderData.amount!,
          currency: orderData.currency ?? "INR",
          name: "MyRentSaathi",
          description: `${title} — ${periodLabel}`,
          order_id: orderData.orderId!,
          prefill: { name: userName, email: userEmail, contact: userPhone },
          theme: { color: "#6366f1" },
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  type: target.kind,
                  amount: payAmt,
                  expectedAmount: amount,
                  alreadyPaid,
                  isPartial,
                  existingPaymentId: target.existingPaymentId ?? undefined,
                  ...target.verifyFields,
                }),
              });
              const verifyData = await verifyRes.json() as { success?: boolean; error?: string };
              if (!verifyRes.ok || verifyData.error) throw new Error(verifyData.error ?? "Payment verification failed");
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });

      toast.success(isPartial ? `Partial payment of ${formatCurrency(payAmt)} successful! ✓` : "Payment successful! ✓");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  // ── Manual Receipt Upload (full) ──────────────────────────────
  async function handleReceiptSubmit() {
    if (!receiptFile) { toast.error("Please select a receipt file."); return; }
    setUploading(true);
    try {
      const uploaded = await uploadReceipt();
      await target.saveManual({
        paidNow: remaining,
        isPartial: false,
        receiptUrl: uploaded?.url ?? null,
        receiptName: uploaded?.name ?? null,
      });
      toast.success("Receipt submitted for verification!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // ── Partial Payment ───────────────────────────────────────────
  async function handlePartialSubmit() {
    const num = parseFloat(partialAmount);
    if (!num || num <= 0) { toast.error("Enter a valid amount."); return; }
    if (num > remaining) { toast.error(`Amount cannot exceed remaining ${formatCurrency(remaining)}.`); return; }

    if (partialMethod === "gateway") {
      await handleRazorpayPay(num);
      return;
    }

    // receipt-based partial
    if (!receiptFile) { toast.error("Please attach your payment receipt."); return; }
    setUploading(true);
    try {
      const uploaded = await uploadReceipt("partial-");
      await target.saveManual({
        paidNow: num,
        isPartial: num < remaining,
        receiptUrl: uploaded?.url ?? null,
        receiptName: uploaded?.name ?? null,
      });
      toast.success(`Partial payment of ${formatCurrency(num)} submitted for verification!`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const headerIcon = mode === "choose" ? "💰" : mode === "gateway" ? "💳" : mode === "manual" ? "📎" : "⚡";
  const headerText = mode === "choose" ? title
    : mode === "gateway" ? "Pay via Gateway"
    : mode === "manual" ? "Upload Receipt" : "Partial Payment";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 pb-0">
          <div className="text-base font-extrabold text-ink">{headerIcon} {headerText}</div>
          <button onClick={mode === "choose" ? onClose : () => setMode("choose")}
            className="text-ink-muted text-lg cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-100">
            {mode === "choose" ? "✕" : "←"}
          </button>
        </div>

        <div className="p-5">
          {/* Amount summary */}
          <div className="bg-brand-50 rounded-[14px] p-4 mb-4 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wide">{periodLabel}</div>
              <div className="text-2xl font-extrabold text-brand-600 mt-0.5">{formatCurrency(amount)}</div>
            </div>
            {alreadyPaid > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-ink-muted">Already paid</div>
                <div className="text-sm font-bold text-green-600">{formatCurrency(alreadyPaid)}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">Remaining</div>
                <div className="text-sm font-extrabold text-red-600">{formatCurrency(remaining)}</div>
              </div>
            )}
          </div>

          {/* ── CHOOSE MODE ── */}
          {mode === "choose" && (
            <div className="space-y-2.5">
              <button
                onClick={() => setMode("gateway")}
                className="w-full flex items-center gap-3 p-4 rounded-[14px] border-2 border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-brand-200 transition-colors">💳</div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">Pay via Gateway</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">UPI, Cards, Net Banking, Wallets</div>
                </div>
                <svg className="text-brand-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                onClick={() => setMode("manual")}
                className="w-full flex items-center gap-3 p-4 rounded-[14px] border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-green-200 transition-colors">📎</div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">Upload Payment Receipt</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">Paid via bank transfer, cash, UPI — upload proof</div>
                </div>
                <svg className="text-green-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                onClick={() => setMode("partial")}
                className="w-full flex items-center gap-3 p-4 rounded-[14px] border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-yellow-200 transition-colors">⚡</div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">Partial Payment</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">Pay a portion now, rest later</div>
                </div>
                <svg className="text-yellow-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── GATEWAY MODE ── */}
          {mode === "gateway" && (
            <div>
              <div className="bg-warm-50 rounded-[14px] p-3.5 mb-4 space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink-muted">Amount</span>
                  <span className="font-bold text-ink">{formatCurrency(remaining)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink-muted">Platform fee</span>
                  <span className="font-bold text-green-600">FREE</span>
                </div>
                <div className="border-t border-border-default pt-1.5 flex justify-between items-center">
                  <span className="font-bold text-ink">Total</span>
                  <span className="font-extrabold text-brand-600">{formatCurrency(remaining)}</span>
                </div>
              </div>
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
              <button
                onClick={() => handleRazorpayPay(remaining)}
                disabled={paying || !scriptReady}
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {paying ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                ) : !scriptReady ? "Loading…" : `Pay ${formatCurrency(remaining)}`}
              </button>
              <div className="text-center text-[10px] text-ink-muted mt-3">🔒 Secured by Razorpay · PCI-DSS compliant</div>
            </div>
          )}

          {/* ── MANUAL RECEIPT MODE ── */}
          {mode === "manual" && (
            <div>
              <p className="text-xs text-ink-muted mb-3">
                Attach proof of payment (screenshot, bank receipt, etc.). It will be verified and confirmed.
              </p>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />

              {!receiptFile ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-green-300 rounded-[14px] py-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-green-50 transition-colors mb-4"
                >
                  <span className="text-3xl">📎</span>
                  <span className="text-sm font-bold text-ink">Tap to choose file</span>
                  <span className="text-[11px] text-ink-muted">JPG, PNG, PDF supported</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-[14px] bg-green-50 border border-green-200 mb-4">
                  <span className="text-2xl">{receiptFile.type.includes("pdf") ? "📄" : "🖼️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-ink truncate">{receiptFile.name}</div>
                    <div className="text-[11px] text-ink-muted">{(receiptFile.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button onClick={() => setReceiptFile(null)} className="text-red-400 hover:text-red-600 text-lg cursor-pointer">✕</button>
                </div>
              )}

              <button
                onClick={handleReceiptSubmit}
                disabled={uploading || !receiptFile}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
                ) : "Send to Verify →"}
              </button>
              <div className="flex items-center gap-1.5 mt-3 justify-center">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                <span className="text-[10px] text-ink-muted">Will be verified and confirmed before it counts as paid</span>
              </div>
            </div>
          )}

          {/* ── PARTIAL PAYMENT MODE ── */}
          {mode === "partial" && (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-3 mb-4 text-xs text-yellow-800">
                Remaining balance: <span className="font-extrabold">{formatCurrency(remaining)}</span>. Enter how much you&apos;re paying now.
              </div>

              <label className="block text-xs font-bold text-ink mb-1.5">Amount paying now (₹)</label>
              <div className="flex items-center border-2 border-border-default focus-within:border-brand-500 rounded-xl overflow-hidden mb-4">
                <span className="px-3 text-sm font-bold text-ink-muted border-r border-border-default py-2.5">₹</span>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={partialAmount}
                  onChange={e => setPartialAmount(e.target.value)}
                  placeholder={`Max ${remaining}`}
                  className="flex-1 px-3 py-2.5 text-sm text-ink focus:outline-none bg-transparent"
                />
              </div>

              {/* How to pay the partial amount */}
              <label className="block text-xs font-bold text-ink mb-1.5">How are you paying?</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setPartialMethod("gateway")}
                  className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer border-2 transition-all ${
                    partialMethod === "gateway" ? "border-brand-400 bg-brand-50 text-brand-600" : "border-border-default text-ink-muted hover:bg-warm-50"
                  }`}
                >
                  💳 Gateway
                </button>
                <button
                  onClick={() => setPartialMethod("receipt")}
                  className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer border-2 transition-all ${
                    partialMethod === "receipt" ? "border-green-400 bg-green-50 text-green-700" : "border-border-default text-ink-muted hover:bg-warm-50"
                  }`}
                >
                  📎 Upload Receipt
                </button>
              </div>

              {partialMethod === "receipt" && (
                <>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />
                  {!receiptFile ? (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-yellow-300 rounded-[14px] py-5 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-yellow-50 transition-colors mb-4"
                    >
                      <span className="text-2xl">📎</span>
                      <span className="text-xs font-bold text-ink">Attach payment proof</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-[14px] bg-yellow-50 border border-yellow-200 mb-4">
                      <span className="text-xl">{receiptFile.type.includes("pdf") ? "📄" : "🖼️"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-ink truncate">{receiptFile.name}</div>
                        <div className="text-[11px] text-ink-muted">{(receiptFile.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button onClick={() => setReceiptFile(null)} className="text-red-400 hover:text-red-600 text-lg cursor-pointer">✕</button>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={handlePartialSubmit}
                disabled={(uploading || paying) || !partialAmount || (partialMethod === "receipt" && !receiptFile) || (partialMethod === "gateway" && !scriptReady)}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {(uploading || paying) ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                ) : partialMethod === "gateway"
                  ? (partialAmount ? `Pay ₹${partialAmount} via Gateway` : "Pay via Gateway")
                  : (partialAmount ? `Submit ₹${partialAmount} for Verification →` : "Submit for Verification →")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
