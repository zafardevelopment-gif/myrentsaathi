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
type PrefillFlat = {
  flat_id: string; flat_number: string; block: string | null; tenant_id: string | null;
  occupied: boolean; rent: number; maintenance_default: number; last_reading: number;
};
type Row = PrefillFlat & { include: boolean; rentStr: string; maintStr: string; currentStr: string };

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisPeriod = () => new Date().toISOString().slice(0, 7);

export default function BillingDashboard() {
  const { user, hydrated } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState(thisPeriod());
  const [rows, setRows] = useState<Row[]>([]);
  const [elecRate, setElecRate] = useState("");
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editInv, setEditInv] = useState<{ id: string; number: string } | null>(null);
  const [editLines, setEditLines] = useState<{ id: string; description: string; unit_rate: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const q = `userId=${user.id}&role=${user.role}`;
    const [s, inv] = await Promise.all([
      fetch(`/api/dashboard/summary?${q}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/invoices?${q}`).then((r) => r.json()).catch(() => ({ invoices: [] })),
    ]);
    setSummary(s && !s.error ? s : null);
    setInvoices(inv.invoices ?? []);
    setLoaded(true);
  }, [user]);

  useEffect(() => { if (hydrated && user) load(); }, [hydrated, user, load]);

  const loadFlats = async () => {
    if (!user) return;
    setLoadingFlats(true); setMsg(null);
    try {
      const res = await fetch(`/api/billing/bill-prefill?userId=${user.id}&role=${user.role}&period=${period}`);
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Failed to load flats"); return; }
      setElecRate(data.elec_rate ? String(data.elec_rate) : "");
      setRows((data.flats as PrefillFlat[]).map((f) => ({
        ...f, include: f.occupied, rentStr: String(f.rent || ""), maintStr: "", currentStr: "",
      })));
    } finally { setLoadingFlats(false); }
  };

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.flat_id === id ? { ...r, ...patch } : r)));

  const rate = Number(elecRate) || 0;
  const calcRow = (r: Row) => {
    const rent = Number(r.rentStr) || 0;
    const maint = Number(r.maintStr) || 0;
    const cur = r.currentStr === "" ? null : Number(r.currentStr);
    const units = cur != null ? Math.max(cur - r.last_reading, 0) : 0;
    const elec = units * rate;
    return { rent, maint, units, elec, total: rent + maint + elec };
  };

  const generate = async () => {
    if (!user) return;
    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) { setMsg("Select at least one flat."); return; }
    setBusy(true); setMsg(null);
    try {
      const payload = {
        user: { id: user.id, role: user.role },
        billing_period: period,
        elec_rate: rate || undefined,
        flats: chosen.map((r) => ({
          flat_id: r.flat_id,
          rent: Number(r.rentStr) || 0,
          maintenance: Number(r.maintStr) || undefined,
          electricity: r.currentStr !== "" ? { current_reading: Number(r.currentStr), last_reading: r.last_reading } : undefined,
        })),
      };
      const res = await fetch("/api/invoices/generate-combined", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 422) setMsg("Setup incomplete: " + (data.missing ?? []).map((m: { message: string }) => m.message).join("; "));
      else if (!res.ok) setMsg(data.error ?? "Failed");
      else { setMsg(`Created ${data.created}, updated ${data.updated ?? 0}, skipped ${data.skipped}.`); setRows([]); await load(); }
    } finally { setBusy(false); }
  };

  const openEdit = async (inv: Invoice) => {
    const detail = await fetch(`/api/invoices/${inv.id}`).then((r) => r.json()).catch(() => null);
    if (!detail?.lines) return;
    setEditLines(detail.lines.map((l: { id: string; description: string; unit_rate: number }) => ({ id: l.id, description: l.description, unit_rate: String(l.unit_rate) })));
    setEditInv({ id: inv.id, number: inv.invoice_number });
  };

  const saveEdit = async () => {
    if (!editInv) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/invoices/${editInv.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_lines", lines: editLines.map((l) => ({ id: l.id, unit_rate: Number(l.unit_rate) || 0 })) }),
      });
      if (res.ok) { setEditInv(null); await load(); }
      else { const d = await res.json(); setMsg(d.error ?? "Edit failed"); }
    } finally { setEditSaving(false); }
  };

  if (!hydrated) return null;
  if (!user) return <div className="p-6 text-sm text-ink-muted">Please log in.</div>;

  const stats: [string, string][] = summary ? [
    ["Properties", String(summary.totalProperties)], ["Units", String(summary.totalUnits)],
    ["Tenants", String(summary.totalTenants)], ["Owners", String(summary.totalOwners)],
    ["This month", inr(summary.monthlyRevenue)], ["Outstanding", inr(summary.outstandingAmount)],
    ["Setup", `${summary.setupPercent}%`],
  ] : [];
  const inputCls = "rounded-lg border border-border-default bg-warm-50 px-2 py-1 text-xs text-ink focus:outline-none focus:border-brand-500 w-24";
  const settingsHref = user.role === "landlord" ? "/landlord/settings" : "/admin/settings";

  return (
    <div className="space-y-5">
      <h2 className="text-[15px] font-extrabold text-ink">🧾 Billing &amp; Invoices</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {!loaded
          ? [...Array(7)].map((_, i) => (
              <div key={i} className="rounded-[14px] border border-border-default bg-white p-3">
                <div className="h-2.5 w-12 rounded bg-warm-100" />
                <div className="mt-2 h-5 w-10 rounded bg-warm-100" />
              </div>
            ))
          : stats.map(([label, val]) => (
              <div key={label} className="rounded-[14px] border border-border-default bg-white p-3">
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
                <div className="mt-1 text-lg font-extrabold text-ink">{val}</div>
              </div>
            ))}
      </div>

      <SetupProgressCard />

      <div className="space-y-4">
          {/* Combined bill builder */}
          <div className="rounded-[14px] border border-border-default bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-ink-muted">Period</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="rounded-xl border border-border-default bg-warm-50 px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500" />
              <button disabled={loadingFlats} onClick={loadFlats}
                className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600 cursor-pointer disabled:opacity-60">
                {loadingFlats ? "Loading…" : "Load flats"}
              </button>
              {rows.length > 0 && (
                <span className="ml-2 text-xs text-ink-muted">
                  Electricity: {rate > 0 ? `₹${rate}/unit` : <span className="text-red-500">not set</span>} ·{" "}
                  <a href={settingsHref} className="text-brand-600 hover:underline">set in Settings</a>
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] text-ink-muted">
              Set rent, add maintenance &amp; enter the current meter reading per flat, then generate one combined bill per flat (Rent + Maintenance + Electricity).
            </p>

            {rows.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-ink-muted">
                    <tr>
                      <th className="py-1 pr-2"></th>
                      <th className="py-1 pr-2">Flat</th>
                      <th className="py-1 pr-2">Rent</th>
                      <th className="py-1 pr-2">Maintenance</th>
                      <th className="py-1 pr-2">Last rdg</th>
                      <th className="py-1 pr-2">Current rdg</th>
                      <th className="py-1 pr-2 text-right">Bill total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const c = calcRow(r);
                      return (
                        <tr key={r.flat_id} className="border-t border-border-default">
                          <td className="py-1.5 pr-2">
                            <input type="checkbox" checked={r.include} onChange={(e) => setRow(r.flat_id, { include: e.target.checked })} />
                          </td>
                          <td className="py-1.5 pr-2 font-semibold text-ink whitespace-nowrap">
                            {r.flat_number}{r.block ? ` (${r.block})` : ""}
                            {!r.occupied && <span className="ml-1 text-[10px] text-ink-muted">vacant</span>}
                          </td>
                          <td className="py-1.5 pr-2"><input className={inputCls} type="number" value={r.rentStr} onChange={(e) => setRow(r.flat_id, { rentStr: e.target.value })} /></td>
                          <td className="py-1.5 pr-2"><input className={inputCls} type="number" placeholder={r.maintenance_default ? String(r.maintenance_default) : "0"} value={r.maintStr} onChange={(e) => setRow(r.flat_id, { maintStr: e.target.value })} /></td>
                          <td className="py-1.5 pr-2 text-ink-muted">{r.last_reading}</td>
                          <td className="py-1.5 pr-2"><input className={inputCls} type="number" placeholder="—" value={r.currentStr} onChange={(e) => setRow(r.flat_id, { currentStr: e.target.value })} /></td>
                          <td className="py-1.5 pr-2 text-right font-bold text-ink whitespace-nowrap">
                            {inr(c.total)}
                            {c.units > 0 && <div className="text-[10px] font-normal text-ink-muted">{c.units}u elec</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button disabled={busy} onClick={generate}
                  className="mt-3 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 cursor-pointer disabled:opacity-60">
                  {busy ? "Generating…" : "Generate Combined Bills"}
                </button>
              </div>
            )}

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
                {!loaded && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-muted">Loading invoices…</td></tr>}
                {loaded && invoices.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-muted">No invoices yet.</td></tr>}
                {loaded && invoices.map((i) => (
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <a href={`/api/invoices/${i.id}/pdf`} target="_blank" className="font-semibold text-brand-600 hover:underline">View</a>
                      {i.amount_paid === 0 && i.status !== "cancelled" && (
                        <button onClick={() => openEdit(i)} className="ml-3 font-semibold text-ink-muted hover:text-ink cursor-pointer">Edit</button>
                      )}
                      {i.status !== "paid" && i.status !== "cancelled" && (
                        <a href={`/api/payment/redirect?invoice=${i.id}`} target="_blank" className="ml-3 font-semibold text-green-600 hover:underline">Pay</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Edit (unpaid bills only) */}
      {editInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditInv(null)}>
          <div className="w-full max-w-md rounded-[18px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-base font-extrabold text-ink">Edit Bill</div>
              <button onClick={() => setEditInv(null)} className="cursor-pointer text-lg text-ink-muted">✕</button>
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">{editInv.number} · only unpaid bills can be edited</div>
            <div className="mt-4 space-y-2">
              {editLines.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-ink">{l.description}</span>
                  <span className="text-xs text-ink-muted">₹</span>
                  <input type="number" value={l.unit_rate}
                    onChange={(e) => setEditLines((ls) => ls.map((x, i) => i === idx ? { ...x, unit_rate: e.target.value } : x))}
                    className="w-28 rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500" />
                </div>
              ))}
              {editLines.length === 0 && <div className="text-xs text-ink-muted">No editable lines.</div>}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditInv(null)} className="flex-1 rounded-xl border border-border-default py-2.5 text-sm font-bold text-ink-muted cursor-pointer">Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600 cursor-pointer disabled:opacity-60">
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">GST is re-applied at current rates on save.</p>
          </div>
        </div>
      )}
    </div>
  );
}
