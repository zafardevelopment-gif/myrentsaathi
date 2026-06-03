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
  if (!user) return <div className="p-6 text-sm text-gray-500">Please log in.</div>;

  const stats: [string, string][] = summary ? [
    ["Properties", String(summary.totalProperties)],
    ["Units", String(summary.totalUnits)],
    ["Tenants", String(summary.totalTenants)],
    ["Owners", String(summary.totalOwners)],
    ["This month", inr(summary.monthlyRevenue)],
    ["Outstanding", inr(summary.outstandingAmount)],
    ["Setup", `${summary.setupPercent}%`],
  ] : [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, val]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1"><SetupProgressCard /></div>

        <div className="space-y-4 lg:col-span-2">
          {/* Generate */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">Period</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm" />
              {["rent", "maintenance", "electricity", "charges"].map((t) => (
                <button key={t} disabled={busy} onClick={() => generate(t)}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                  Generate {t}
                </button>
              ))}
            </div>
            {msg && <p className="mt-2 text-sm text-gray-600">{msg}</p>}
          </div>

          {/* Invoice list */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Period</th><th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Outstanding</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No invoices yet.</td></tr>}
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{i.invoice_number}</td>
                    <td className="px-3 py-2">{i.invoice_type}</td>
                    <td className="px-3 py-2">{i.billing_period ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{inr(i.total_amount)}</td>
                    <td className="px-3 py-2 text-right">{inr(Number(i.total_amount) - Number(i.amount_paid))}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: i.status === "paid" ? "#dcfce7" : i.status === "overdue" ? "#fee2e2" : "#fef9c3" }}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <a href={`/api/invoices/${i.id}/pdf`} target="_blank" className="text-indigo-600 hover:underline">View</a>
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
