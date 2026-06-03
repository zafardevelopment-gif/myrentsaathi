"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import SetupProgressCard from "./SetupProgressCard";

type Summary = {
  totalProperties: number; totalUnits: number; totalTenants: number; totalOwners: number;
  monthlyRevenue: number; outstandingAmount: number; setupPercent: number;
};
type Invoice = {
  id: string; invoice_number: string; invoice_type: string; billing_period: string | null;
  total_amount: number; amount_paid: number; status: string; due_date: string | null;
};

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisPeriod = () => new Date().toISOString().slice(0, 7);

export default function BillingDashboard() {
  const { user, hydrated } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState(thisPeriod());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const q = `userId=${user.id}&role=${user.role}`;
    const [s, inv] = await Promise.all([
      fetch(`/api/dashboard/summary?${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/invoices?${q}`).then((r) => r.json()).catch(() => ({ invoices: [] })),
    ]);
    setSummary(s && !s.error ? s : null);
    setInvoices(inv.invoices ?? []);
  }, [user]);

  useEffect(() => { if (hydrated && user) load(); }, [hydrated, user, load]);

  const generate = async (invoice_type: string) => {
    if (!user) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/invoices/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { id: user.id, role: user.role }, invoice_type, billing_period: period }),
      });
      const data = await res.json();
      if (res.status === 422) setMsg("Setup incomplete: " + (data.missing ?? []).map((m: { message: string }) => m.message).join("; "));
      else if (!res.ok) setMsg(data.error ?? "Failed");
      else { setMsg(`Created ${data.created}, skipped ${data.skipped}.`); await load(); }
    } finally { setBusy(false); }
  };

  if (!hydrated) return null;
  if (!user) return <div className="p-6 text-sm text-ink-muted">Please log in.</div>;

  const stats: [string, string][] = summary ? [
    ["Properties", String(summary.totalProperties)],
    ["Units", String(summary.totalUnits)],
    ["Tenants", String(summary.totalTenants)],
    ["Owners", String(summary.totalOwners)],
    ["This month", inr(summary.monthlyRevenue)],
    ["Outstanding", inr(summary.outstandingAmount)],
    ["Setup", `${summary.setupPercent}%`],
  ] : [];

  const genBtn = "rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600 cursor-pointer disabled:opacity-60";

  return (
    <div className="space-y-5">
      <h2 className="text-[15px] font-extrabold text-ink">🧾 Billing &amp; Invoices</h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, val]) => (
          <div key={label} className="rounded-[14px] border border-border-default bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
            <div className="mt-1 text-lg font-extrabold text-ink">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1"><SetupProgressCard /></div>

        <div className="space-y-4 lg:col-span-2">
          {/* Generate */}
          <div className="rounded-[14px] border border-border-default bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-ink-muted">Period</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="rounded-xl border border-border-default bg-warm-50 px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500" />
              <button disabled={busy} onClick={() => generate("rent")} className={genBtn}>Generate rent</button>
              <button disabled={busy} onClick={() => generate("maintenance")} className={genBtn}>Generate maintenance</button>
              <button disabled={busy} onClick={() => generate("electricity")} className={genBtn}>Generate electricity</button>
              <button disabled={busy} onClick={() => generate("charges")} className={genBtn}>Generate charges</button>
            </div>
            {msg && <p className="mt-2 text-xs text-ink-muted">{msg}</p>}
          </div>

          {/* Invoice list */}
          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-left text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Invoice</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Type</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide">Total</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide">Outstanding</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-muted">No invoices yet.</td></tr>}
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-border-default">
                    <td className="px-3 py-2 font-mono text-xs text-ink">{i.invoice_number}</td>
                    <td className="px-3 py-2 capitalize text-ink">{i.invoice_type}</td>
                    <td className="px-3 py-2 text-ink-muted">{i.billing_period ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{inr(i.total_amount)}</td>
                    <td className="px-3 py-2 text-right text-ink">{inr(Number(i.total_amount) - Number(i.amount_paid))}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        i.status === "paid" ? "bg-green-100 text-green-700"
                        : i.status === "overdue" ? "bg-red-100 text-red-700"
                        : i.status === "partially_paid" ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"}`}>
                        {i.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <a href={`/api/invoices/${i.id}/pdf`} target="_blank" className="font-semibold text-brand-600 hover:underline">View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
