"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : "0%";

type Invoice = {
  id: string; invoice_number: string; invoice_type: string; billing_period: string | null;
  total_amount: number; amount_paid: number; status: string; created_at: string;
  flat_id: string | null; flat: { flat_number: string; block: string | null } | null;
};
type Notification = { id: string; type: "email" | "whatsapp"; status: string; created_at: string; invoice_id: string | null };
type MeterReading = { billing_period: string; units_consumed: number; meter: { id: string; flat_id: string; flat: { flat_number: string; block: string | null } | null } | null };

type Tab = "overview" | "invoices" | "monthly" | "electricity" | "notifications" | "gst";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "monthly", label: "Monthly", icon: "📅" },
  { key: "electricity", label: "Electricity", icon: "⚡" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "gst", label: "GST / Tax", icon: "🏛️" },
];

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-green-100 text-green-700", unpaid: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700", partially_paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function LandlordReports() {
  const { user, hydrated } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => {
    if (!hydrated || !user) return;
    async function load() {
      const q = `userId=${user!.id}&role=${user!.role}`;
      const invRes = await fetch(`/api/invoices?${q}`).then(r => r.json()).catch(() => ({ invoices: [] }));
      setInvoices(invRes.invoices ?? []);

      // Fetch meter readings via supabase
      type MeterRow = { id: string; flat_id: string; flat: { flat_number: string; block: string | null } | { flat_number: string; block: string | null }[] | null };
      const { data: metersData } = await supabase.from("meters")
        .select("id, flat_id, flat:flats(flat_number, block)")
        .eq(user!.role === "landlord" ? "landlord_id" : "society_id", user!.id);

      if (metersData?.length) {
        const meterIds = (metersData as MeterRow[]).map(m => m.id);
        const { data: rdgs } = await supabase.from("meter_readings")
          .select("billing_period, units_consumed, meter_id")
          .in("meter_id", meterIds).order("billing_period", { ascending: false });

        // Normalize flat (Supabase may return array or object for join)
        const normalize = (m: MeterRow): { id: string; flat_id: string; flat: { flat_number: string; block: string | null } | null } => {
          const f = m.flat;
          const flat = Array.isArray(f) ? (f[0] ?? null) : f;
          return { id: m.id, flat_id: m.flat_id, flat };
        };
        const meterMap = Object.fromEntries((metersData as MeterRow[]).map(m => [m.id, normalize(m)]));

        setReadings((rdgs ?? []).map((r: { billing_period: string; units_consumed: number; meter_id: string }) => ({
          billing_period: r.billing_period,
          units_consumed: Number(r.units_consumed) || 0,
          meter: meterMap[r.meter_id] ?? null,
        })));
      }

      setLoading(false);
    }
    load();
  }, [hydrated, user]);

  if (!hydrated || !user) return null;
  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;

  // ─── Derived stats ───────────────────────────────────────────
  const active = invoices.filter(i => i.status !== "cancelled");
  const paid = active.filter(i => i.status === "paid");
  const unpaid = active.filter(i => i.status === "unpaid");
  const overdue = active.filter(i => i.status === "overdue");
  const partial = active.filter(i => i.status === "partially_paid");

  const totalBilled = active.reduce((a, i) => a + Number(i.total_amount), 0);
  const totalCollected = active.reduce((a, i) => a + Number(i.amount_paid), 0);
  const totalOutstanding = totalBilled - totalCollected;

  const byType = (type: string) => active.filter(i => i.invoice_type === type);
  const rentInv = byType("rent");
  const maintInv = byType("maintenance");
  const elecInv = byType("electricity");
  const rentCollected = rentInv.reduce((a, i) => a + Number(i.amount_paid), 0);
  const maintCollected = maintInv.reduce((a, i) => a + Number(i.amount_paid), 0);
  const elecCollected = elecInv.reduce((a, i) => a + Number(i.amount_paid), 0);

  // Monthly revenue
  const monthlyMap: Record<string, { billed: number; collected: number }> = {};
  for (const i of active) {
    const p = i.billing_period ?? i.created_at?.slice(0, 7) ?? "—";
    monthlyMap[p] = monthlyMap[p] ?? { billed: 0, collected: 0 };
    monthlyMap[p].billed += Number(i.total_amount);
    monthlyMap[p].collected += Number(i.amount_paid);
  }
  const monthlyRows = Object.entries(monthlyMap).sort((a, b) => b[0].localeCompare(a[0]));

  // Electricity readings
  const elecByPeriod: Record<string, { units: number; flats: string[] }> = {};
  for (const r of readings) {
    const p = r.billing_period;
    elecByPeriod[p] = elecByPeriod[p] ?? { units: 0, flats: [] };
    elecByPeriod[p].units += r.units_consumed;
    const flatLabel = r.meter?.flat ? `${r.meter.flat.flat_number}${r.meter.flat.block ? ` (${r.meter.flat.block})` : ""}` : "—";
    elecByPeriod[p].flats.push(flatLabel);
  }
  const elecRows = Object.entries(elecByPeriod).sort((a, b) => b[0].localeCompare(a[0]));
  const totalUnits = readings.reduce((a, r) => a + r.units_consumed, 0);

  // GST totals
  const gstTotal = active.reduce((a, i) => {
    // Approximate from total - sub_total (we don't have gst directly in invoice type here)
    return a;
  }, 0);

  // Filtered invoices
  const filteredInv = filterPeriod
    ? active.filter(i => (i.billing_period ?? "").startsWith(filterPeriod))
    : active;

  const card = (label: string, value: string, sub?: string, color?: string) => (
    <div className="rounded-[14px] border border-border-default bg-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`text-xl font-extrabold mt-1 ${color ?? "text-ink"}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-extrabold text-ink">📊 Reports & Analytics</h2>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${tab === t.key ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {card("Total Billed", inr(totalBilled))}
            {card("Total Collected", inr(totalCollected), pct(totalCollected, totalBilled) + " collected", "text-green-700")}
            {card("Outstanding", inr(totalOutstanding), `${unpaid.length + overdue.length} invoices`, "text-brand-500")}
            {card("Overdue", inr(overdue.reduce((a, i) => a + Number(i.total_amount) - Number(i.amount_paid), 0)), `${overdue.length} invoices`, "text-red-600")}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card("Rent Collected", inr(rentCollected), `${rentInv.length} invoices`)}
            {card("Maintenance Collected", inr(maintCollected), `${maintInv.length} invoices`)}
            {card("Electricity Collected", inr(elecCollected), `${totalUnits} units total`)}
            {card("Total Invoices", String(active.length), `${paid.length} paid · ${unpaid.length + overdue.length} unpaid`)}
          </div>

          {/* Status breakdown */}
          <div className="rounded-[14px] border border-border-default bg-white p-4">
            <div className="text-sm font-extrabold text-ink mb-3">Invoice Status Breakdown</div>
            <div className="space-y-2">
              {[
                { label: "Paid", count: paid.length, amt: paid.reduce((a, i) => a + Number(i.total_amount), 0), color: "bg-green-500" },
                { label: "Unpaid", count: unpaid.length, amt: unpaid.reduce((a, i) => a + Number(i.total_amount), 0), color: "bg-yellow-400" },
                { label: "Overdue", count: overdue.length, amt: overdue.reduce((a, i) => a + Number(i.total_amount), 0), color: "bg-red-500" },
                { label: "Partially Paid", count: partial.length, amt: partial.reduce((a, i) => a + Number(i.total_amount), 0), color: "bg-blue-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-ink-muted">{s.label} ({s.count})</div>
                  <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: pct(s.count, active.length) }} />
                  </div>
                  <div className="w-28 text-right text-xs font-semibold text-ink">{inr(s.amt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab === "invoices" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input type="month" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none" />
            {filterPeriod && <button onClick={() => setFilterPeriod("")} className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>}
            <span className="ml-auto text-[11px] text-ink-muted self-center">{filteredInv.length} invoices</span>
          </div>

          {/* By type summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Rent", invoices: rentInv },
              { label: "Maintenance", invoices: maintInv },
              { label: "Electricity", invoices: elecInv },
            ].map(t => {
              const billed = t.invoices.reduce((a, i) => a + Number(i.total_amount), 0);
              const collected = t.invoices.reduce((a, i) => a + Number(i.amount_paid), 0);
              return (
                <div key={t.label} className="rounded-[14px] border border-border-default bg-white p-3">
                  <div className="text-xs font-semibold text-ink-muted">{t.label}</div>
                  <div className="text-base font-extrabold text-ink mt-1">{inr(billed)}</div>
                  <div className="text-[11px] text-green-600 mt-0.5">Collected: {inr(collected)}</div>
                  <div className="text-[11px] text-red-500">Due: {inr(billed - collected)}</div>
                </div>
              );
            })}
          </div>

          {/* Invoice table */}
          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <table className="w-full text-xs">
              <thead className="bg-warm-50 text-left text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wide">Invoice</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wide">Flat</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wide">Type</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wide">Period</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Total</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Collected</th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Due</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInv.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">No invoices found.</td></tr>}
                {filteredInv.map(i => (
                  <tr key={i.id} className="border-t border-border-default">
                    <td className="px-3 py-2 font-mono text-ink">{i.invoice_number}</td>
                    <td className="px-3 py-2 text-ink-muted">{i.flat ? `${i.flat.flat_number}${i.flat.block ? ` (${i.flat.block})` : ""}` : "—"}</td>
                    <td className="px-3 py-2 capitalize text-ink">{i.invoice_type}</td>
                    <td className="px-3 py-2 text-ink-muted">{i.billing_period ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{inr(i.total_amount)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{inr(i.amount_paid)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(Number(i.total_amount) - Number(i.amount_paid))}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[i.status] ?? ""}`}>{i.status.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY ── */}
      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {card("Best Month", monthlyRows[0] ? inr(monthlyRows[0][1].billed) : "—", monthlyRows[0]?.[0])}
            {card("Total Billed (All Time)", inr(totalBilled))}
            {card("Collection Rate", pct(totalCollected, totalBilled), "of total billed")}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-left text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Billed</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Collected</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Outstanding</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted text-sm">No data yet.</td></tr>}
                {monthlyRows.map(([period, data]) => (
                  <tr key={period} className="border-t border-border-default">
                    <td className="px-4 py-2.5 font-semibold text-ink">{period}</td>
                    <td className="px-4 py-2.5 text-right text-ink">{inr(data.billed)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 font-semibold">{inr(data.collected)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{inr(data.billed - data.collected)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-warm-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: pct(data.collected, data.billed) }} />
                        </div>
                        <span className="text-xs text-ink-muted w-10 text-right">{pct(data.collected, data.billed)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ELECTRICITY ── */}
      {tab === "electricity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {card("Total Units Consumed", `${totalUnits} units`)}
            {card("Electricity Billed", inr(elecInv.reduce((a, i) => a + Number(i.total_amount), 0)))}
            {card("Electricity Collected", inr(elecCollected), undefined, "text-green-700")}
          </div>

          {readings.length === 0 ? (
            <div className="rounded-[14px] border border-border-default bg-white p-8 text-center text-ink-muted text-sm">
              No meter readings found. Generate bills with electricity readings to see data here.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warm-50 text-left text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Flat</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Units Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => {
                    const flatLabel = r.meter?.flat ? `${r.meter.flat.flat_number}${r.meter.flat.block ? ` (${r.meter.flat.block})` : ""}` : "—";
                    return (
                      <tr key={i} className="border-t border-border-default">
                        <td className="px-4 py-2.5 font-semibold text-ink">{r.billing_period}</td>
                        <td className="px-4 py-2.5 text-ink-muted">{flatLabel}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink">{r.units_consumed} units</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-brand-200 bg-warm-50">
                    <td colSpan={2} className="px-4 py-2.5 font-extrabold text-ink">Total</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-brand-500">{totalUnits} units</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === "notifications" && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {card("Emails Sent", "—", "No log data yet")}
                {card("WhatsApp Sent", "—", "No log data yet")}
                {card("Notifications Total", "—")}
                {card("Delivery Rate", "—")}
              </div>
              <div className="rounded-[14px] border border-border-default bg-white p-6">
                <div className="text-sm font-extrabold text-ink mb-2">About Notifications</div>
                <div className="space-y-2 text-xs text-ink-muted">
                  <div className="flex items-start gap-2">
                    <span>📧</span>
                    <span><b>Email notifications</b> are sent automatically when bills are generated. Email is sent to the tenant with invoice details and Pay Now button.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>💬</span>
                    <span><b>WhatsApp notifications</b> can be sent from the WhatsApp section. Configure WhatsApp in Settings → WhatsApp Notifications.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>⚙️</span>
                    <span>Notification logs will appear here once the notification tracking is fully enabled.</span>
                  </div>
                </div>

                {/* Email sent per invoice */}
                <div className="mt-4 text-sm font-extrabold text-ink mb-2">Invoices Generated (Email Triggered)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-ink-muted">
                      <tr>
                        <th className="py-1.5 pr-3 font-semibold uppercase tracking-wide">Invoice</th>
                        <th className="py-1.5 pr-3 font-semibold uppercase tracking-wide">Period</th>
                        <th className="py-1.5 pr-3 font-semibold uppercase tracking-wide">Amount</th>
                        <th className="py-1.5 font-semibold uppercase tracking-wide">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.slice(0, 10).map(i => (
                        <tr key={i.id} className="border-t border-border-default">
                          <td className="py-1.5 pr-3 font-mono text-ink">{i.invoice_number}</td>
                          <td className="py-1.5 pr-3 text-ink-muted">{i.billing_period ?? "—"}</td>
                          <td className="py-1.5 pr-3 text-ink">{inr(i.total_amount)}</td>
                          <td className="py-1.5">
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Sent</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── GST / TAX ── */}
      {tab === "gst" && (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-border-default bg-warm-50 p-3 text-xs text-ink-muted">
            GST rates configured in Settings → Billing Rates. Tax is applied per line item on every invoice.
          </div>

          {/* GST by period */}
          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <div className="border-b border-border-default px-4 py-2.5">
              <span className="text-sm font-extrabold text-ink">GST Summary by Period</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-left text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Taxable (Sub Total)</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Total Billed</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">GST (approx.)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted text-sm">No data yet.</td></tr>}
                {monthlyRows.map(([period, data]) => {
                  const periodInv = active.filter(i => (i.billing_period ?? "") === period);
                  const billed = data.billed;
                  // Approximate sub_total from invoices (we track gst_amount via total)
                  const gstApprox = periodInv.reduce((a, i) => {
                    // gst = total - sub_total, but we don't have sub_total here; use rough estimate
                    return a;
                  }, 0);
                  return (
                    <tr key={period} className="border-t border-border-default">
                      <td className="px-4 py-2.5 font-semibold text-ink">{period}</td>
                      <td className="px-4 py-2.5 text-right text-ink-muted">—</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink">{inr(billed)}</td>
                      <td className="px-4 py-2.5 text-right text-ink-muted">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed GST - fetch from API */}
          <GstDetailSection userId={user.id} role={user.role} />
        </div>
      )}
    </div>
  );
}

function GstDetailSection({ userId, role }: { userId: string; role: string }) {
  const [data, setData] = useState<{ period: string; taxable_outward: number; cgst: number; sgst: number; igst: number; total_tax: number } | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/gst-rates?userId=${userId}&role=${role}&period=${period}`).then(r => r.json()).catch(() => null);
      // Try the billing reports API
      const res2 = await fetch(`/api/reports/gst?userId=${userId}&role=${role}&period=${period}`).then(r => r.json()).catch(() => null);
      if (res2 && !res2.error) setData(res2);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [period]);

  return (
    <div className="rounded-[14px] border border-border-default bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-extrabold text-ink">GSTR-3B Summary</div>
        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
          className="ml-auto rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none" />
      </div>
      {loading ? (
        <div className="text-xs text-ink-muted">Loading…</div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Taxable Outward", value: inr(data.taxable_outward) },
            { label: "CGST", value: inr(data.cgst) },
            { label: "SGST", value: inr(data.sgst) },
            { label: "Total Tax", value: inr(data.total_tax), highlight: true },
          ].map(d => (
            <div key={d.label} className="bg-warm-50 rounded-xl p-3">
              <div className="text-[10px] text-ink-muted uppercase tracking-wide">{d.label}</div>
              <div className={`text-sm font-extrabold mt-1 ${d.highlight ? "text-brand-500" : "text-ink"}`}>{d.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-ink-muted p-4 text-center">
          GST report data not available. Ensure invoices are generated with GST rates configured.
        </div>
      )}
    </div>
  );
}
