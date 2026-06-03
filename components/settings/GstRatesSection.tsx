"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";

type RateRow = { applies_to: string; rate_percent: number; effective_to: string | null; effective_from: string };
const TYPES: { key: string; label: string; hint: string }[] = [
  { key: "rent", label: "Rent GST", hint: "e.g. 18" },
  { key: "maintenance", label: "Maintenance GST", hint: "e.g. 5" },
  { key: "electricity", label: "Electricity GST", hint: "0" },
];

/** Billing Rates: per-type GST % (Rent / Maintenance / Electricity) + Electricity ₹/unit. */
export default function GstRatesSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({ rent: "", maintenance: "", electricity: "" });
  const [elecUnit, setElecUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const [gstRes, rateRes] = await Promise.all([
      fetch(`/api/billing/gst-rates?userId=${user.id}&role=${user.role}`).then((r) => r.json()).catch(() => ({ rates: [] })),
      fetch(`/api/billing/rates?userId=${user.id}&role=${user.role}`).then((r) => r.json()).catch(() => ({ electricity_rate: 0 })),
    ]);
    const rows: RateRow[] = gstRes.rates ?? [];
    const next: Record<string, string> = { rent: "", maintenance: "", electricity: "" };
    for (const t of TYPES) {
      const active = rows.filter((r) => r.applies_to === t.key).sort((a, b) => (b.effective_from || "").localeCompare(a.effective_from || ""))[0];
      if (active) next[t.key] = String(active.rate_percent);
    }
    setVals(next);
    setElecUnit(rateRes.electricity_rate ? String(rateRes.electricity_rate) : "");
  }, [user]);

  useEffect(() => { if (open && user) load(); }, [open, user, load]);

  const save = async () => {
    if (!user) return;
    setSaving(true); setMsg("");
    try {
      for (const t of TYPES) {
        if (vals[t.key] === "") continue;
        await fetch("/api/billing/gst-rates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { id: user.id, role: user.role }, applies_to: t.key, rate_percent: Number(vals[t.key]) }),
        });
      }
      if (elecUnit !== "") {
        await fetch("/api/billing/rates", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { id: user.id, role: user.role }, electricity_rate: Number(elecUnit) }),
        });
      }
      setMsg("Saved ✓"); await load();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden">
      <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors" onClick={() => setOpen(!open)}>
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">📊</div>
        <div className="flex-1">
          <div className="text-sm font-bold text-ink">Billing Rates</div>
          <div className="text-[11px] text-ink-muted">GST % per type + electricity per-unit rate</div>
        </div>
        <span className="text-ink-muted text-sm">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-border-light pt-3">
          <div className="text-[11px] text-ink-muted mb-3">GST is applied per line on every bill. Changing a rate affects only new invoices (old ones keep their rate).</div>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <span className="text-xs text-ink w-32">{t.label}</span>
                <input type="number" value={vals[t.key]} placeholder={t.hint}
                  onChange={(e) => setVals((v) => ({ ...v, [t.key]: e.target.value }))}
                  className="w-24 rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500" />
                <span className="text-xs text-ink-muted">%</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-border-light mt-1">
              <span className="text-xs text-ink w-32">Electricity rate</span>
              <input type="number" value={elecUnit} placeholder="e.g. 8"
                onChange={(e) => setElecUnit(e.target.value)}
                className="w-24 rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500" />
              <span className="text-xs text-ink-muted">₹/unit</span>
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="mt-3 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60 hover:bg-brand-600">
            {saving ? "Saving…" : "Save Billing Rates"}
          </button>
          {msg && <span className="ml-2 text-[11px] font-semibold text-green-600">{msg}</span>}
        </div>
      )}
    </div>
  );
}
