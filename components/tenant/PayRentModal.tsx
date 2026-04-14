"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

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

type PayMode = "choose" | "gateway" | "manual" | "partial";

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
  tenantId, monthYear, amount, alreadyPaid = 0, existingPaymentId,
  userName, userEmail, userPhone, onClose, onSuccess,
}: Props) {
  const [mode, setMode] = useState<PayMode>("choose");
  const [paying, setPaying] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  // Manual receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Partial payment
  const [partialAmount, setPartialAmount] = useState("");

  const monthLabel = new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
  const remaining = amount - alreadyPaid;
  const razorpayConfigured = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  // ── Gateway Payment ──────────────────────────────────────────
  async function handleRazorpayPay(payAmt: number) {
    if (!scriptReady) { toast.error("Payment gateway not loaded. Please try again."); return; }
    setPaying(true);
    try {
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmt, tenantId, monthYear, type: "rent", description: `Rent for ${monthLabel}` }),
      });
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!orderRes.ok || orderData.error) throw new Error(orderData.error ?? "Failed to create payment order");

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
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  type: "rent", tenantId, monthYear, amount: payAmt,
                  existingPaymentId: existingPaymentId ?? undefined,
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

      toast.success("Payment successful! ✓");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  // ── Manual Receipt Upload ────────────────────────────────────
  async function handleReceiptSubmit() {
    if (!receiptFile) { toast.error("Please select a receipt file."); return; }
    setUploading(true);
    try {
      const ext = receiptFile.name.split(".").pop() ?? "jpg";
      const path = `receipts/${tenantId}/${monthYear}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, receiptFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
      const receiptUrl = urlData.publicUrl;

      if (existingPaymentId) {
        // Update existing row
        const { error } = await supabase.from("rent_payments").update({
          receipt_url: receiptUrl,
          receipt_name: receiptFile.name,
          receipt_status: "pending_verification",
        }).eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        // Insert new pending row
        const { error } = await supabase.from("rent_payments").insert({
          tenant_id: tenantId,
          month_year: monthYear,
          expected_amount: amount,
          amount: amount,
          status: "pending",
          receipt_url: receiptUrl,
          receipt_name: receiptFile.name,
          receipt_status: "pending_verification",
        });
        if (error) throw error;
      }
      toast.success("Receipt submitted for verification!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // ── Partial Payment (receipt upload with custom amount) ──────
  async function handlePartialSubmit() {
    const num = parseFloat(partialAmount);
    if (!num || num <= 0) { toast.error("Enter a valid amount."); return; }
    if (num > remaining) { toast.error(`Amount cannot exceed remaining ${formatCurrency(remaining)}.`); return; }
    if (!receiptFile) { toast.error("Please attach your payment receipt."); return; }
    setUploading(true);
    try {
      const ext = receiptFile.name.split(".").pop() ?? "jpg";
      const path = `receipts/${tenantId}/${monthYear}-partial-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, receiptFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
      const receiptUrl = urlData.publicUrl;

      if (existingPaymentId) {
        const { error } = await supabase.from("rent_payments").update({
          receipt_url: receiptUrl,
          receipt_name: receiptFile.name,
          receipt_status: "pending_verification",
          paid_amount: (alreadyPaid || 0) + num,
        }).eq("id", existingPaymentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rent_payments").insert({
          tenant_id: tenantId,
          month_year: monthYear,
          expected_amount: amount,
          amount: num,
          status: "pending",
          receipt_url: receiptUrl,
          receipt_name: receiptFile.name,
          receipt_status: "pending_verification",
          paid_amount: num,
        });
        if (error) throw error;
      }
      toast.success(`Partial payment of ${formatCurrency(num)} submitted for verification!`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 pb-0">
          <div className="text-base font-extrabold text-ink">
            {mode === "choose" ? "💰 Pay Rent" :
             mode === "gateway" ? "💳 Pay via Gateway" :
             mode === "manual" ? "📎 Upload Receipt" : "⚡ Partial Payment"}
          </div>
          <button onClick={mode === "choose" ? onClose : () => setMode("choose")}
            className="text-ink-muted text-lg cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-100">
            {mode === "choose" ? "✕" : "←"}
          </button>
        </div>

        <div className="p-5">
          {/* Amount summary */}
          <div className="bg-brand-50 rounded-[14px] p-4 mb-4 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wide">{monthLabel}</div>
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
              {/* Option 1: Payment Gateway */}
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

              {/* Option 2: Manual Receipt */}
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

              {/* Option 3: Partial Payment */}
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
                  <span className="text-ink-muted">Rent amount</span>
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
                Attach proof of payment (screenshot, bank receipt, etc.). Your landlord will verify and confirm it.
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
                <span className="text-[10px] text-ink-muted">Landlord will verify and confirm your payment</span>
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

              <button
                onClick={handlePartialSubmit}
                disabled={uploading || !receiptFile || !partialAmount}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
                ) : partialAmount ? `Submit ₹${partialAmount} for Verification →` : "Submit for Verification →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
