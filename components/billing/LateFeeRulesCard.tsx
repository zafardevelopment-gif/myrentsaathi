"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import toast from "react-hot-toast";

type LateFeeRule = {
  id: string;
  invoice_type: string | null;
  grace_days: number;
  fee_type: "flat" | "percent";
  fee_value: number;
  recurrence: "once" | "daily" | "monthly";
  max_fee: number | null;
  effective_from: string;
  is_active: boolean;
};

const RECURRENCE_OPTIONS: { value: LateFeeRule["recurrence"]; label: string }[] = [
  { value: "once", label: "Ek baar" },
  { value: "daily", label: "Har din" },
  { value: "monthly", label: "Har mahine" },
];

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/**
 * Landlord/society "late fee" settings — grace period and penalty applied to
 * rent that's still unpaid after the due date. Backed by
 * /api/billing/late-fee-rules + the daily apply-late-fees cron
 * (lib/billing/late-fee-service.ts). Only invoices due on/after the
 * "effective from" date are ever charged a late fee.
 */
export default function LateFeeRulesCard() {
  const { user, hydrated } = useAuth();
  const [rule, setRule] = useState<LateFeeRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [graceDays, setGraceDays] = useState("5");
  const [feeType, setFeeType] = useState<"flat" | "percent">("flat");
  const [feeValue, setFeeValue] = useState("100");
  const [recurrence, setRecurrence] = useState<LateFeeRule["recurrence"]>("once");
  const [maxFee, setMaxFee] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/late-fee-rules?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      const existing: LateFeeRule | undefined = (data.rules ?? []).find((r: LateFeeRule) => !r.invoice_type) ?? data.rules?.[0];
      if (existing) {
        setRule(existing);
        setGraceDays(String(existing.grace_days));
        setFeeType(existing.fee_type);
        setFeeValue(String(existing.fee_value));
        setRecurrence(existing.recurrence);
        setMaxFee(existing.max_fee != null ? String(existing.max_fee) : "");
        setEffectiveFrom(existing.effective_from);
        setActive(existing.is_active);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (hydrated && user) load(); }, [hydrated, user, load]);

  const save = async () => {
    if (!user) return;
    const value = Number(feeValue);
    if (!value || value <= 0) { toast.error("Enter a fee amount greater than 0."); return; }

    setSaving(true);
    try {
      const payload = {
        user: { id: user.id, role: user.role },
        invoice_type: null,
        grace_days: Number(graceDays) || 0,
        fee_type: feeType,
        fee_value: value,
        recurrence,
        max_fee: maxFee ? Number(maxFee) : null,
        effective_from: effectiveFrom,
        is_active: active,
      };
      const res = await fetch("/api/billing/late-fee-rules", {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule ? { ...payload, id: rule.id } : payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save late fee settings."); return; }
      toast.success("Late fee settings saved.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    const rent = 10000;
    const daysLate = 10;
    const fee = feeType === "flat" ? Number(feeValue) || 0 : Math.round((rent * (Number(feeValue) || 0)) / 100);
    return { rent, daysLate, fee, total: rent + fee };
  }, [feeType, feeValue]);

  if (loading) return null;

  return (
    <div className="rounded-[14px] border border-border-default bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">Late Fee</h3>
        <label className="flex items-center gap-2 text-xs font-bold text-ink-muted cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Active
        </label>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Automatically add a penalty to an invoice once it's overdue past the grace period.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-ink mb-1">Grace period</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={30} value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              className="w-20 rounded-lg border border-border-default px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-ink-muted">days after due date before a late fee applies</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">Fee</label>
          <div className="flex items-center gap-2">
            <select
              value={feeType} onChange={(e) => setFeeType(e.target.value as "flat" | "percent")}
              className="rounded-lg border border-border-default px-2 py-1.5 text-sm bg-white"
            >
              <option value="flat">Flat ₹</option>
              <option value="percent">% of rent</option>
            </select>
            <input
              type="number" min={0} value={feeValue}
              onChange={(e) => setFeeValue(e.target.value)}
              className="w-24 rounded-lg border border-border-default px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">Repeat</label>
          <select
            value={recurrence} onChange={(e) => setRecurrence(e.target.value as LateFeeRule["recurrence"])}
            className="w-full rounded-lg border border-border-default px-2 py-1.5 text-sm bg-white"
          >
            {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">Max fee (optional cap)</label>
          <input
            type="number" min={0} value={maxFee} placeholder="No cap"
            onChange={(e) => setMaxFee(e.target.value)}
            className="w-full rounded-lg border border-border-default px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-warm-50 px-3 py-2 text-xs text-ink-muted">
        Only invoices due on/after <b className="text-ink">{effectiveFrom}</b> are ever charged a late fee.
        <label className="ml-2 inline-flex items-center gap-1 text-ink">
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="rounded border border-border-default px-1.5 py-0.5 text-xs" />
        </label>
      </div>

      <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
        {inr(preview.rent)} rent, {preview.daysLate} din late → late fee {inr(preview.fee)}, total {inr(preview.total)}
      </div>

      <button
        onClick={save} disabled={saving}
        className="mt-4 rounded-xl bg-brand-500 text-white text-sm font-bold px-4 py-2 disabled:opacity-60 cursor-pointer"
      >
        {saving ? "Saving…" : rule ? "Update late fee settings" : "Turn on late fee"}
      </button>
    </div>
  );
}
