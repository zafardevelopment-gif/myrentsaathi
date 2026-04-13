"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getUserSubscription,
  getDaysRemaining,
  type Subscription,
} from "@/lib/subscription";

// ── Generate invoices only from subscription start_date forward ──
interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;         // payment date (ISO)
  periodFrom: string;   // plan cover start
  periodTo: string;     // plan cover end
  amount: number;
  planName: string;
  status: "paid" | "pending";
}

function generateInvoices(sub: Subscription): Invoice[] {
  // Only paid (active) subscriptions have invoices — trial has none
  if (sub.status === "trial") return [];
  if (!sub.activated_at) return [];

  const invoices: Invoice[] = [];
  const activatedAt = new Date(sub.activated_at);
  const now = new Date();
  // Seed random once per sub.id so invoice numbers don't change on re-render
  let seed = sub.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  function seededRand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return 1000 + (seed % 9000);
  }

  // Generate one invoice per month from activation to now
  let cursor = new Date(activatedAt);
  cursor.setDate(1); // normalise to 1st
  let i = 0;
  while (cursor <= now && i < 24) {
    const periodFrom = new Date(cursor);
    const periodTo   = new Date(cursor);
    periodTo.setMonth(periodTo.getMonth() + 1);
    periodTo.setDate(0); // last day of month

    const yr  = periodFrom.getFullYear();
    const mo  = String(periodFrom.getMonth() + 1).padStart(2, "0");
    const num = seededRand();

    invoices.push({
      id:          `inv-${i}`,
      invoiceNo:   `INV-${yr}${mo}-${num}`,
      date:        periodFrom.toISOString().slice(0, 10),
      periodFrom:  periodFrom.toISOString().slice(0, 10),
      periodTo:    periodTo.toISOString().slice(0, 10),
      amount:      sub.plan_price,
      planName:    sub.plan_name,
      status:      "paid",
    });

    cursor.setMonth(cursor.getMonth() + 1);
    i++;
  }
  return invoices.reverse(); // newest first
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Invoice Detail Modal ──────────────────────────────────────
function InvoiceModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light bg-warm-50">
          <div className="text-[14px] font-extrabold text-ink">📄 Invoice Detail</div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-lg cursor-pointer">✕</button>
        </div>

        {/* Invoice body */}
        <div className="p-5 space-y-4" id="invoice-print-area">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏠</span>
            <span className="font-serif text-lg font-extrabold text-ink">
              MyRent<span className="text-brand-500">Saathi</span>
            </span>
          </div>

          {/* Invoice number + date */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] text-ink-muted font-medium uppercase tracking-wide">Invoice Number</div>
              <div className="text-[13px] font-extrabold text-ink font-mono">{inv.invoiceNo}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink-muted font-medium uppercase tracking-wide">Invoice Date</div>
              <div className="text-[13px] font-extrabold text-ink">{fmtDate(inv.date)}</div>
            </div>
          </div>

          {/* Plan period */}
          <div className="bg-warm-50 rounded-xl p-3 border border-border-light">
            <div className="text-[10px] text-ink-muted font-bold uppercase tracking-wide mb-2">Plan Period</div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-[10px] text-ink-muted">From</div>
                <div className="font-bold text-ink">{fmtDate(inv.periodFrom)}</div>
              </div>
              <div className="text-ink-muted self-center">→</div>
              <div className="text-right">
                <div className="text-[10px] text-ink-muted">To</div>
                <div className="font-bold text-ink">{fmtDate(inv.periodTo)}</div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="border border-border-light rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-warm-100 px-3 py-2 text-[10px] font-bold text-ink-muted uppercase tracking-wide">
              <span className="col-span-2">Description</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-3 items-center border-t border-border-light">
              <div className="col-span-2">
                <div className="text-[12px] font-bold text-ink">{inv.planName} Plan</div>
                <div className="text-[10px] text-ink-muted">{fmtDate(inv.periodFrom)} – {fmtDate(inv.periodTo)}</div>
              </div>
              <div className="text-right text-[13px] font-extrabold text-ink">₹{inv.amount.toLocaleString("en-IN")}</div>
            </div>
            <div className="grid grid-cols-3 px-3 py-2.5 bg-brand-50 border-t border-border-light">
              <span className="col-span-2 text-[12px] font-extrabold text-ink">Total</span>
              <span className="text-right text-[13px] font-extrabold text-brand-600">₹{inv.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-muted">Payment Status</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
              ✓ Paid
            </span>
          </div>

          {/* Note */}
          <div className="text-[10px] text-ink-muted text-center border-t border-border-light pt-3">
            PDF download — payment gateway active hone ke baad available hoga
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-[12px] font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5"
          >
            🖨️ Print Invoice
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border-default text-[12px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    trial:     "bg-blue-100 text-blue-700",
    active:    "bg-green-100 text-green-700",
    expired:   "bg-red-100 text-red-600",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status === "trial" ? "Free Trial" : status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function SubscriptionSection({ planType }: { planType: "society" | "landlord" }) {
  const { user } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null | "loading">("loading");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getUserSubscription(user.id).then(setSub);
  }, [user]);

  if (sub === "loading") {
    return <div className="h-32 bg-warm-100 rounded-[14px] animate-pulse mb-2" />;
  }

  if (!sub) {
    return (
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[22px]">🔑</span>
          <div>
            <div className="text-sm font-bold text-ink">Subscription</div>
            <div className="text-[11px] text-ink-muted">Koi active plan nahi hai</div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/select-plan?type=${planType}`)}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600"
        >
          Plan Choose Karein →
        </button>
      </div>
    );
  }

  const daysLeft    = getDaysRemaining(sub);
  const isExpired   = sub.status === "expired" || daysLeft === 0;
  const expiresDate = fmtDate(sub.expires_at);
  const startsDate  = fmtDate(sub.starts_at);
  const invoices    = generateInvoices(sub);

  const trialProgress = sub.status === "trial"
    ? Math.max(0, Math.min(100, Math.round(((sub.trial_days - daysLeft) / sub.trial_days) * 100)))
    : 100;

  return (
    <>
      {selectedInv && <InvoiceModal inv={selectedInv} onClose={() => setSelectedInv(null)} />}

      <div className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-light">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">🔑</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-ink">Subscription</span>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {sub.plan_name} Plan · ₹{sub.plan_price.toLocaleString("en-IN")}/mo
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/select-plan?type=${planType}`)}
              className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-[11px] font-bold cursor-pointer hover:bg-brand-600 flex-shrink-0"
            >
              {isExpired ? "Renew" : "Upgrade"}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {/* Trial progress bar */}
          {sub.status === "trial" && (
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-muted">Free Trial Progress</span>
                <span className={`font-bold ${daysLeft <= 5 ? "text-red-500" : "text-ink"}`}>
                  {daysLeft} din baaki
                </span>
              </div>
              <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${daysLeft <= 5 ? "bg-red-400" : "bg-brand-500"}`}
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Plan",       value: sub.plan_name },
              { label: "Status",     value: sub.status === "trial" ? "Free Trial" : sub.status.charAt(0).toUpperCase() + sub.status.slice(1) },
              { label: "Start Date", value: startsDate },
              { label: "Expires",    value: expiresDate },
              { label: "Monthly",    value: `₹${sub.plan_price.toLocaleString("en-IN")}` },
              { label: "Days Left",  value: isExpired ? "Expired" : `${daysLeft} days` },
            ].map((item) => (
              <div key={item.label} className="bg-warm-50 rounded-xl px-3 py-2">
                <div className="text-[10px] text-ink-muted font-medium">{item.label}</div>
                <div className="text-[12px] font-bold text-ink mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {!isExpired && daysLeft <= 7 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span>⚠️</span>
              <div className="text-[11px] text-red-600 font-semibold">
                Aapka plan {daysLeft} din mein expire hoga. Abhi renew karein.
              </div>
            </div>
          )}
          {isExpired && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span>🔴</span>
              <div className="text-[11px] text-red-600 font-semibold">
                Plan expire ho gaya hai. Dashboard access ke liye renew karein.
              </div>
            </div>
          )}

          {/* Invoice section */}
          <div className="border-t border-border-light pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[12px] font-bold text-ink">
                📄 Invoices & Payment History
                {invoices.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-600 text-[9px] font-bold">
                    {invoices.length}
                  </span>
                )}
              </span>
              <span className="text-ink-muted text-xs">{showHistory ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                {/* Trial — no invoices */}
                {sub.status === "trial" || invoices.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-ink-muted">
                    {sub.status === "trial"
                      ? "Free trial mein koi invoice nahi hota. Plan activate karne ke baad invoices yahan dikhenge."
                      : "Abhi koi payment record nahi hai."}
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_1.4fr_0.7fr_auto] gap-2 px-2 text-[10px] font-bold text-ink-muted uppercase tracking-wide">
                      <span>Date</span>
                      <span>Invoice #</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Action</span>
                    </div>

                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="grid grid-cols-[1fr_1.4fr_0.7fr_auto] gap-2 items-center bg-warm-50 rounded-xl px-3 py-2.5 hover:bg-warm-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedInv(inv)}
                      >
                        <span className="text-[11px] text-ink-muted">{inv.date}</span>
                        <span className="text-[11px] font-mono text-brand-600 truncate">{inv.invoiceNo}</span>
                        <span className="text-[12px] font-bold text-ink text-right">₹{inv.amount.toLocaleString("en-IN")}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInv(inv); }}
                          className="text-[10px] font-bold text-brand-500 hover:text-brand-600 cursor-pointer whitespace-nowrap flex items-center gap-0.5"
                        >
                          View ↗
                        </button>
                      </div>
                    ))}

                    <div className="text-[10px] text-ink-muted text-center pt-1">
                      PDF download — payment gateway active hone ke baad available hoga
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
