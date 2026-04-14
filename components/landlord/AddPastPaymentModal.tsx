"use client";

/**
 * AddPastPaymentModal
 * Landlord can record any past month's payment for any of their occupied flats.
 * Inserts directly as status="paid" with payment_method="manual_entry".
 * Tenant sees it immediately in their payment history.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type FlatOption = {
  id: string;
  flat_number: string;
  block: string | null;
  monthly_rent: number | null;
  society?: { name: string } | null;
  tenantId: string | null;       // tenants.id
  tenantName: string | null;
};

type Props = {
  landlordEmail: string;
  onClose: () => void;
  onSuccess: () => void;
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

// Generate last 24 months options
function generateMonthOptions(): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

export default function AddPastPaymentModal({ landlordEmail, onClose, onSuccess }: Props) {
  const [flats, setFlats] = useState<FlatOption[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(true);

  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const monthOptions = generateMonthOptions();
  const selectedFlat = flats.find(f => f.id === selectedFlatId) ?? null;

  // Load landlord's occupied flats with tenant info
  useEffect(() => {
    async function load() {
      setLoadingFlats(true);
      // Get landlord user id
      const { data: userRow } = await supabase.from("users").select("id").eq("email", landlordEmail).single();
      if (!userRow) { setLoadingFlats(false); return; }

      // Get flats
      const { data: flatRows } = await supabase
        .from("flats")
        .select("id, flat_number, block, monthly_rent, society:societies(name)")
        .eq("owner_id", userRow.id)
        .eq("status", "occupied")
        .order("flat_number");
      if (!flatRows || flatRows.length === 0) { setLoadingFlats(false); return; }

      // Get tenants for those flats
      const flatIds = flatRows.map(f => f.id);
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("id, flat_id, user_id")
        .in("flat_id", flatIds)
        .eq("status", "active");

      // Get user names
      const userIds = (tenantRows ?? []).map(t => t.user_id).filter(Boolean);
      const { data: userRows } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", userIds);

      const userNameMap = new Map((userRows ?? []).map(u => [u.id, u.full_name]));
      const tenantByFlat = new Map((tenantRows ?? []).map(t => ({
        flatId: t.flat_id,
        tenantId: t.id,
        name: userNameMap.get(t.user_id) ?? null,
      })).map(t => [t.flatId, t]));

      const options: FlatOption[] = flatRows.map(f => {
        const t = tenantByFlat.get(f.id);
        return {
          id: f.id,
          flat_number: f.flat_number,
          block: f.block,
          monthly_rent: f.monthly_rent,
          society: (f.society as { name: string } | null),
          tenantId: t?.tenantId ?? null,
          tenantName: t?.name ?? null,
        };
      });
      setFlats(options);
      if (options.length === 1) setSelectedFlatId(options[0].id);
      setLoadingFlats(false);
    }
    load().catch(() => setLoadingFlats(false));
  }, [landlordEmail]);

  // When flat changes, prefill rent amount
  useEffect(() => {
    if (selectedFlat?.monthly_rent) {
      setAmount(String(selectedFlat.monthly_rent));
    }
  }, [selectedFlatId]);

  // Check if a payment already exists for this flat+month
  useEffect(() => {
    if (!selectedFlat?.tenantId || !monthYear) { setExistingPayment(null); return; }
    setCheckingExisting(true);
    supabase
      .from("rent_payments")
      .select("id, status")
      .eq("tenant_id", selectedFlat.tenantId)
      .eq("month_year", monthYear)
      .maybeSingle()
      .then(({ data }) => {
        setExistingPayment(data ?? null);
        setCheckingExisting(false);
      });
  }, [selectedFlat?.tenantId, monthYear]);

  async function handleSave() {
    if (!selectedFlatId) { toast.error("Select a flat."); return; }
    if (!monthYear) { toast.error("Select the month."); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error("Enter a valid amount."); return; }
    if (!selectedFlat?.tenantId) { toast.error("No active tenant found for this flat."); return; }

    setSaving(true);
    const amt = parseFloat(amount);

    try {
      if (existingPayment) {
        // Update existing row
        const { error } = await supabase.from("rent_payments").update({
          amount: amt,
          expected_amount: amt,
          status: "paid",
          payment_date: paymentDate,
          payment_method: paymentMethod,
          receipt_status: null,
          paid_amount: null,
        }).eq("id", existingPayment.id);
        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase.from("rent_payments").insert({
          tenant_id: selectedFlat.tenantId,
          flat_id: selectedFlatId,
          month_year: monthYear,
          amount: amt,
          expected_amount: amt,
          status: "paid",
          payment_date: paymentDate,
          payment_method: paymentMethod,
        });
        if (error) throw error;
      }

      const monthLabel = new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
      toast.success(`${monthLabel} payment recorded!`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-border-default rounded-xl px-3 py-2.5 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-5 pb-4 border-b border-border-light sticky top-0 bg-white rounded-t-[18px] z-10">
          <div>
            <div className="text-base font-extrabold text-ink">📋 Record Past Payment</div>
            <div className="text-[11px] text-ink-muted mt-0.5">Mark any month as paid for a tenant</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-100 text-ink-muted text-lg cursor-pointer">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Flat selector */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Select Flat</label>
            {loadingFlats ? (
              <div className="h-10 bg-warm-100 rounded-xl animate-pulse" />
            ) : flats.length === 0 ? (
              <div className="text-xs text-ink-muted bg-warm-50 rounded-xl p-3 border border-border-default">
                No occupied flats found. Assign a tenant first.
              </div>
            ) : (
              <select className={inputCls} value={selectedFlatId} onChange={e => setSelectedFlatId(e.target.value)}>
                <option value="">— Choose flat —</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    Flat {f.flat_number}{f.block ? ` (${f.block})` : ""}{f.society ? ` · ${f.society.name}` : ""}{f.tenantName ? ` — ${f.tenantName}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tenant info pill */}
          {selectedFlat?.tenantName && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800 flex-shrink-0">
                {selectedFlat.tenantName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-xs font-bold text-ink">{selectedFlat.tenantName}</div>
                <div className="text-[10px] text-ink-muted">Tenant · Flat {selectedFlat.flat_number}{selectedFlat.block ? ` (${selectedFlat.block})` : ""}</div>
              </div>
            </div>
          )}

          {/* Month selector */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Payment Month</label>
            <select className={inputCls} value={monthYear} onChange={e => setMonthYear(e.target.value)}>
              <option value="">— Choose month —</option>
              {monthOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Existing payment warning */}
          {checkingExisting && monthYear && selectedFlat?.tenantId && (
            <div className="text-[11px] text-ink-muted">Checking existing records…</div>
          )}
          {existingPayment && !checkingExisting && (
            <div className={`rounded-xl px-3 py-2.5 text-xs border ${
              existingPayment.status === "paid"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-yellow-50 border-yellow-200 text-yellow-700"
            }`}>
              {existingPayment.status === "paid"
                ? "⚠️ This month already has a paid record — saving will overwrite it with your entered amount."
                : "ℹ️ A pending/overdue record exists for this month — it will be updated to paid."}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Amount Paid
              {selectedFlat?.monthly_rent && (
                <span className="text-ink-muted font-normal ml-1.5">(monthly rent: {formatCurrency(selectedFlat.monthly_rent)})</span>
              )}
            </label>
            <div className="flex items-center border border-border-default focus-within:border-brand-500 rounded-xl overflow-hidden bg-warm-50">
              <span className="px-3 text-sm font-bold text-ink-muted border-r border-border-default py-2.5">₹</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 px-3 py-2.5 text-sm text-ink focus:outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Payment Method</label>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                    paymentMethod === m.value
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-warm-50 text-ink-muted border-border-default hover:border-brand-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Notes <span className="text-ink-muted font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Paid in cash at door, cheque no. 123…"
              rows={2}
              className={inputCls + " resize-none"}
            />
          </div>

          {/* Preview */}
          {selectedFlat && monthYear && amount && (
            <div className="bg-brand-50 border border-brand-100 rounded-[14px] p-3.5">
              <div className="text-[10px] text-brand-500 font-bold uppercase tracking-wide mb-2">Payment Summary</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Tenant</span>
                  <span className="font-bold text-ink">{selectedFlat.tenantName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Flat</span>
                  <span className="font-bold text-ink">Flat {selectedFlat.flat_number}{selectedFlat.block ? ` (${selectedFlat.block})` : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Month</span>
                  <span className="font-bold text-ink">{new Date(monthYear + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Amount</span>
                  <span className="font-extrabold text-green-700">{formatCurrency(parseFloat(amount) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Method</span>
                  <span className="font-bold text-ink capitalize">{paymentMethod.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Date</span>
                  <span className="font-bold text-ink">{new Date(paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || loadingFlats || !selectedFlatId || !monthYear || !amount}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
            ) : "✓ Record as Paid"}
          </button>
          <p className="text-center text-[10px] text-ink-muted -mt-1">
            This will appear in tenant&apos;s payment history as a confirmed payment.
          </p>
        </div>
      </div>
    </div>
  );
}
