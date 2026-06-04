"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : "0%";
const PAGE_SIZE = 10;

type Invoice = {
  id: string; invoice_number: string; invoice_type: string; billing_period: string | null;
  total_amount: number; amount_paid: number; status: string; created_at: string;
  issue_date?: string | null; recipient_name?: string | null;
  sub_total?: number; gst_amount?: number; cgst_total?: number; sgst_total?: number; igst_total?: number;
  flat_id: string | null; flat: { flat_number: string; block: string | null } | null;
};
type Notification = { id: string; type: "email" | "whatsapp"; status: string; created_at: string; invoice_id: string | null };
type MeterReading = { billing_period: string; units_consumed: number; meter: { id: string; flat_id: string; flat: { flat_number: string; block: string | null } | null } | null };
type MaintLine = { period: string; flatLabel: string; amount: number; paid: boolean };

type Tab = "overview" | "invoices" | "monthly" | "electricity" | "maintenance" | "notifications" | "gst";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "monthly", label: "Monthly", icon: "📅" },
  { key: "electricity", label: "Electricity", icon: "⚡" },
  { key: "maintenance", label: "Maintenance", icon: "🔧" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "gst", label: "GST / Tax", icon: "🏛️" },
];

// Download an array of objects as a CSV file.
function downloadCSV(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-green-100 text-green-700", unpaid: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700", partially_paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function LandlordReports() {
  const { user, hydrated } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications] = useState<Notification[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [maintLines, setMaintLines] = useState<MaintLine[]>([]);
  const [loading, setLoading] = useState(true);

  const [maintSearch, setMaintSearch] = useState("");
  const [maintPage, setMaintPage] = useState(1);

  const [gstSearch, setGstSearch] = useState("");
  const [gstFilterPeriod, setGstFilterPeriod] = useState("");
  const [gstPage, setGstPage] = useState(1);

  // Shared filter / search / pagination state per tab
  const [invSearch, setInvSearch] = useState("");
  const [invFilterPeriod, setInvFilterPeriod] = useState("");
  const [invFilterType, setInvFilterType] = useState("all");
  const [invFilterStatus, setInvFilterStatus] = useState("all");
  const [invPage, setInvPage] = useState(1);

  const [monthSearch, setMonthSearch] = useState("");
  const [monthPage, setMonthPage] = useState(1);

  const [elecSearch, setElecSearch] = useState("");
  const [elecFilterPeriod, setElecFilterPeriod] = useState("");
  const [elecPage, setElecPage] = useState(1);

  // Reset pages on filter change
  const resetInvPage = () => setInvPage(1);
  const resetElecPage = () => setElecPage(1);
  const resetMonthPage = () => setMonthPage(1);

  useEffect(() => {
    if (!hydrated || !user) return;
    async function load() {
      const q = `userId=${user!.id}&role=${user!.role}`;
      const invRes = await fetch(`/api/invoices?${q}`).then(r => r.json()).catch(() => ({ invoices: [] }));
      const invList: Invoice[] = invRes.invoices ?? [];
      setInvoices(invList);

      // Maintenance is a LINE ITEM inside combined bills — fetch those lines so
      // maintenance collection can be reported (not a separate invoice type).
      const invById = Object.fromEntries(invList.map((i) => [i.id, i]));
      const invIds = invList.filter((i) => i.status !== "cancelled").map((i) => i.id);
      if (invIds.length > 0) {
        const { data: lines } = await supabase
          .from("invoice_line_items")
          .select("invoice_id, description, line_total")
          .in("invoice_id", invIds)
          .ilike("description", "Maintenance%");
        const ml: MaintLine[] = (lines ?? []).map((l: { invoice_id: string; line_total: number }) => {
          const inv = invById[l.invoice_id];
          const flatLabel = inv?.flat ? `${inv.flat.flat_number}${inv.flat.block ? ` (${inv.flat.block})` : ""}` : "—";
          return { period: inv?.billing_period ?? "—", flatLabel, amount: Number(l.line_total) || 0, paid: inv?.status === "paid" };
        });
        setMaintLines(ml);
      }

      // Fetch meter readings via supabase
      const { data: metersData } = await supabase.from("meters")
        .select("id, flat_id, flat:flats(flat_number, block)")
        .eq(user!.role === "landlord" ? "landlord_id" : "society_id", user!.id);

      if (metersData?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metersRaw = metersData as any[];
        const meterIds: string[] = metersRaw.map((m) => String(m.id));
        const { data: rdgs } = await supabase.from("meter_readings")
          .select("billing_period, units_consumed, meter_id")
          .in("meter_id", meterIds).order("billing_period", { ascending: false });

        // Build meterMap: normalize flat (Supabase returns array or object for join)
        const meterMap: Record<string, { id: string; flat_id: string; flat: { flat_number: string; block: string | null } | null }> = {};
        for (const m of metersRaw) {
          const rawFlat = m.flat;
          const flat = Array.isArray(rawFlat)
            ? (rawFlat[0] ? { flat_number: String(rawFlat[0].flat_number), block: rawFlat[0].block ?? null } : null)
            : (rawFlat ? { flat_number: String(rawFlat.flat_number), block: rawFlat.block ?? null } : null);
          meterMap[String(m.id)] = { id: String(m.id), flat_id: String(m.flat_id), flat };
        }

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
  const elecInv = byType("electricity");
  const rentCollected = rentInv.reduce((a, i) => a + Number(i.amount_paid), 0);
  const elecCollected = elecInv.reduce((a, i) => a + Number(i.amount_paid), 0);

  // Maintenance is a line item → derive from maintLines (billed = all, collected = paid invoices).
  const maintBilled = maintLines.reduce((a, l) => a + l.amount, 0);
  const maintCollected = maintLines.filter((l) => l.paid).reduce((a, l) => a + l.amount, 0);

  // Monthly revenue
  const monthlyMap: Record<string, { billed: number; collected: number }> = {};
  for (const i of active) {
    const p = i.billing_period ?? i.created_at?.slice(0, 7) ?? "—";
    monthlyMap[p] = monthlyMap[p] ?? { billed: 0, collected: 0 };
    monthlyMap[p].billed += Number(i.total_amount);
    monthlyMap[p].collected += Number(i.amount_paid);
  }
  const monthlyRows = Object.entries(monthlyMap).sort((a, b) => b[0].localeCompare(a[0]));

  // Electricity total
  const totalUnits = readings.reduce((a, r) => a + r.units_consumed, 0);

  // Filtered invoices
  const filteredInv = active.filter(i => {
    const flatLabel = i.flat ? `${i.flat.flat_number}${i.flat.block ? ` ${i.flat.block}` : ""}`.toLowerCase() : "";
    const matchSearch = invSearch === "" ||
      i.invoice_number.toLowerCase().includes(invSearch.toLowerCase()) ||
      flatLabel.includes(invSearch.toLowerCase());
    const matchPeriod = invFilterPeriod === "" || (i.billing_period ?? "").startsWith(invFilterPeriod);
    const matchType = invFilterType === "all" || i.invoice_type === invFilterType;
    const matchStatus = invFilterStatus === "all" || i.status === invFilterStatus;
    return matchSearch && matchPeriod && matchType && matchStatus;
  });
  const invTotalPages = Math.max(1, Math.ceil(filteredInv.length / PAGE_SIZE));
  const invPaged = filteredInv.slice((invPage - 1) * PAGE_SIZE, invPage * PAGE_SIZE);

  // Filtered monthly rows
  const filteredMonthly = monthlyRows.filter(([period]) =>
    monthSearch === "" || period.toLowerCase().includes(monthSearch.toLowerCase())
  );
  const monthTotalPages = Math.max(1, Math.ceil(filteredMonthly.length / PAGE_SIZE));
  const monthPaged = filteredMonthly.slice((monthPage - 1) * PAGE_SIZE, monthPage * PAGE_SIZE);

  // Filtered electricity readings
  const filteredElec = readings.filter(r => {
    const flatLabel = r.meter?.flat ? `${r.meter.flat.flat_number}${r.meter.flat.block ? ` ${r.meter.flat.block}` : ""}`.toLowerCase() : "";
    const matchSearch = elecSearch === "" ||
      r.billing_period.toLowerCase().includes(elecSearch.toLowerCase()) ||
      flatLabel.includes(elecSearch.toLowerCase());
    const matchPeriod = elecFilterPeriod === "" || r.billing_period.startsWith(elecFilterPeriod);
    return matchSearch && matchPeriod;
  });
  const elecTotalPages = Math.max(1, Math.ceil(filteredElec.length / PAGE_SIZE));
  const elecPaged = filteredElec.slice((elecPage - 1) * PAGE_SIZE, elecPage * PAGE_SIZE);

  // Filtered maintenance lines
  const filteredMaint = maintLines.filter((m) => {
    const q = maintSearch.toLowerCase();
    return q === "" || m.flatLabel.toLowerCase().includes(q) || m.period.toLowerCase().includes(q);
  });
  const maintTotalPages = Math.max(1, Math.ceil(filteredMaint.length / PAGE_SIZE));
  const maintPaged = filteredMaint.slice((maintPage - 1) * PAGE_SIZE, maintPage * PAGE_SIZE);

  // GST invoice-level rows (only invoices that actually carry GST).
  const gstInvoices = active
    .filter((i) => Number(i.gst_amount ?? 0) > 0)
    .filter((i) => {
      const q = gstSearch.toLowerCase();
      const flatLabel = i.flat ? `${i.flat.flat_number}${i.flat.block ? ` ${i.flat.block}` : ""}`.toLowerCase() : "";
      const matchSearch = q === "" || i.invoice_number.toLowerCase().includes(q) || flatLabel.includes(q) || (i.recipient_name ?? "").toLowerCase().includes(q);
      const matchPeriod = gstFilterPeriod === "" || (i.billing_period ?? "").startsWith(gstFilterPeriod);
      return matchSearch && matchPeriod;
    });
  const gstTotalPages = Math.max(1, Math.ceil(gstInvoices.length / PAGE_SIZE));
  const gstPaged = gstInvoices.slice((gstPage - 1) * PAGE_SIZE, gstPage * PAGE_SIZE);
  const gstTotals = gstInvoices.reduce((acc, i) => ({
    taxable: acc.taxable + Number(i.sub_total ?? 0),
    cgst: acc.cgst + Number(i.cgst_total ?? 0),
    sgst: acc.sgst + Number(i.sgst_total ?? 0),
    igst: acc.igst + Number(i.igst_total ?? 0),
    gst: acc.gst + Number(i.gst_amount ?? 0),
    total: acc.total + Number(i.total_amount ?? 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, total: 0 });

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
            {card("Maintenance Collected", inr(maintCollected), `${maintLines.length} charges`)}
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
          {/* Type summary cards (maintenance is a line item, derived separately) */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Rent", billed: rentInv.reduce((a, i) => a + Number(i.total_amount), 0), collected: rentCollected },
              { label: "Maintenance", billed: maintBilled, collected: maintCollected },
              { label: "Electricity", billed: elecInv.reduce((a, i) => a + Number(i.total_amount), 0), collected: elecCollected },
            ].map(t => (
              <div key={t.label} className="rounded-[14px] border border-border-default bg-white p-3">
                <div className="text-xs font-semibold text-ink-muted">{t.label}</div>
                <div className="text-base font-extrabold text-ink mt-1">{inr(t.billed)}</div>
                <div className="text-[11px] text-green-600 mt-0.5">Collected: {inr(t.collected)}</div>
                <div className="text-[11px] text-red-500">Due: {inr(t.billed - t.collected)}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-3 py-2.5">
              <input type="text" placeholder="Search invoice # or flat…" value={invSearch}
                onChange={e => { setInvSearch(e.target.value); resetInvPage(); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-44" />
              <select value={invFilterType} onChange={e => { setInvFilterType(e.target.value); resetInvPage(); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none">
                <option value="all">All Types</option>
                <option value="rent">Rent</option>
                <option value="maintenance">Maintenance</option>
                <option value="electricity">Electricity</option>
              </select>
              <select value={invFilterStatus} onChange={e => { setInvFilterStatus(e.target.value); resetInvPage(); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none">
                <option value="all">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partially_paid">Partially Paid</option>
              </select>
              <input type="month" value={invFilterPeriod} onChange={e => { setInvFilterPeriod(e.target.value); resetInvPage(); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none" />
              {(invSearch || invFilterType !== "all" || invFilterStatus !== "all" || invFilterPeriod) && (
                <button onClick={() => { setInvSearch(""); setInvFilterType("all"); setInvFilterStatus("all"); setInvFilterPeriod(""); resetInvPage(); }}
                  className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>
              )}
              <button onClick={() => downloadCSV(`invoices-${user.id}.csv`, filteredInv.map((i) => ({
                Invoice: i.invoice_number,
                Flat: i.flat ? `${i.flat.flat_number}${i.flat.block ? ` (${i.flat.block})` : ""}` : "—",
                Type: i.invoice_type, Period: i.billing_period ?? "—",
                Total: Number(i.total_amount), Collected: Number(i.amount_paid),
                Due: Number(i.total_amount) - Number(i.amount_paid), Status: i.status,
              })))}
                className="rounded-lg border border-brand-300 text-brand-600 px-2.5 py-1.5 text-xs font-semibold cursor-pointer hover:bg-brand-50">⬇ Export CSV</button>
              <span className="ml-auto text-[11px] text-ink-muted">{filteredInv.length} invoices</span>
            </div>
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
                {invPaged.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">No invoices found.</td></tr>}
                {invPaged.map(i => (
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
            {invTotalPages > 1 && <Pagination page={invPage} total={invTotalPages} onChange={setInvPage} />}
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
            <div className="flex items-center gap-2 border-b border-border-default px-3 py-2.5">
              <input type="text" placeholder="Search period (e.g. 2026-06)…" value={monthSearch}
                onChange={e => { setMonthSearch(e.target.value); resetMonthPage(); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-48" />
              {monthSearch && <button onClick={() => { setMonthSearch(""); resetMonthPage(); }} className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>}
              <span className="ml-auto text-[11px] text-ink-muted">{filteredMonthly.length} periods</span>
            </div>
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
                {monthPaged.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted text-sm">No data yet.</td></tr>}
                {monthPaged.map(([period, data]) => (
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
            {monthTotalPages > 1 && <Pagination page={monthPage} total={monthTotalPages} onChange={setMonthPage} />}
          </div>
        </div>
      )}

      {/* ── ELECTRICITY ── */}
      {tab === "electricity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {card("Total Units Consumed", `${filteredElec.reduce((a, r) => a + r.units_consumed, 0)} units`, `${readings.length} readings total`)}
            {card("Electricity Billed", inr(elecInv.reduce((a, i) => a + Number(i.total_amount), 0)))}
            {card("Electricity Collected", inr(elecCollected), undefined, "text-green-700")}
          </div>

          {readings.length === 0 ? (
            <div className="rounded-[14px] border border-border-default bg-white p-8 text-center text-ink-muted text-sm">
              No meter readings found. Generate bills with electricity readings to see data here.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-3 py-2.5">
                <input type="text" placeholder="Search flat or period…" value={elecSearch}
                  onChange={e => { setElecSearch(e.target.value); resetElecPage(); }}
                  className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-44" />
                <input type="month" value={elecFilterPeriod} onChange={e => { setElecFilterPeriod(e.target.value); resetElecPage(); }}
                  className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none" />
                {(elecSearch || elecFilterPeriod) && (
                  <button onClick={() => { setElecSearch(""); setElecFilterPeriod(""); resetElecPage(); }}
                    className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>
                )}
                <span className="ml-auto text-[11px] text-ink-muted">{filteredElec.length} readings</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-warm-50 text-left text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Flat</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Units Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {elecPaged.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-muted">No readings found.</td></tr>}
                  {elecPaged.map((r, i) => {
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
                    <td colSpan={2} className="px-4 py-2.5 font-extrabold text-ink">
                      {filteredElec.length < readings.length ? `Filtered Total (${filteredElec.length} readings)` : "Total"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-brand-500">
                      {filteredElec.reduce((a, r) => a + r.units_consumed, 0)} units
                    </td>
                  </tr>
                </tbody>
              </table>
              {elecTotalPages > 1 && <Pagination page={elecPage} total={elecTotalPages} onChange={setElecPage} />}
            </div>
          )}
        </div>
      )}

      {/* ── MAINTENANCE ── */}
      {tab === "maintenance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {card("Maintenance Billed", inr(maintBilled), `${maintLines.length} charges`)}
            {card("Maintenance Collected", inr(maintCollected), pct(maintCollected, maintBilled) + " collected", "text-green-700")}
            {card("Maintenance Outstanding", inr(maintBilled - maintCollected), undefined, "text-brand-500")}
          </div>

          {maintLines.length === 0 ? (
            <div className="rounded-[14px] border border-border-default bg-white p-8 text-center text-ink-muted text-sm">
              No maintenance charges yet. Add maintenance when generating bills to see data here.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-3 py-2.5">
                <input type="text" placeholder="Search flat or period…" value={maintSearch}
                  onChange={e => { setMaintSearch(e.target.value); setMaintPage(1); }}
                  className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-44" />
                {maintSearch && <button onClick={() => { setMaintSearch(""); setMaintPage(1); }} className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>}
                <button onClick={() => downloadCSV(`maintenance-${user.id}.csv`, filteredMaint.map((m) => ({ Period: m.period, Flat: m.flatLabel, Amount: m.amount, Status: m.paid ? "Collected" : "Pending" })))}
                  className="rounded-lg border border-brand-300 text-brand-600 px-2.5 py-1.5 text-xs font-semibold cursor-pointer hover:bg-brand-50">⬇ Export CSV</button>
                <span className="ml-auto text-[11px] text-ink-muted">{filteredMaint.length} charges</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-warm-50 text-left text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Flat</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintPaged.map((m, i) => (
                    <tr key={i} className="border-t border-border-default">
                      <td className="px-4 py-2.5 font-semibold text-ink">{m.period}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{m.flatLabel}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink">{inr(m.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {m.paid ? "Collected" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-brand-200 bg-warm-50">
                    <td colSpan={2} className="px-4 py-2.5 font-extrabold text-ink">
                      {filteredMaint.length < maintLines.length ? `Filtered Total (${filteredMaint.length})` : "Total"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-brand-500">{inr(filteredMaint.reduce((a, m) => a + m.amount, 0))}</td>
                    <td className="px-4 py-2.5 text-[11px] text-green-700">{inr(filteredMaint.filter((m) => m.paid).reduce((a, m) => a + m.amount, 0))} collected</td>
                  </tr>
                </tbody>
              </table>
              {maintTotalPages > 1 && <Pagination page={maintPage} total={maintTotalPages} onChange={setMaintPage} />}
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

          {/* Totals cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card("Taxable Value", inr(gstTotals.taxable), `${gstInvoices.length} taxable invoices`)}
            {card("CGST", inr(gstTotals.cgst))}
            {card("SGST", inr(gstTotals.sgst))}
            {card("Total GST", inr(gstTotals.gst), gstTotals.igst > 0 ? `incl. IGST ${inr(gstTotals.igst)}` : undefined, "text-brand-500")}
          </div>

          {/* Invoice-level GST detail */}
          <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-4 py-2.5">
              <span className="text-sm font-extrabold text-ink mr-2">GST Invoice Register</span>
              <input type="text" placeholder="Search invoice/flat…" value={gstSearch}
                onChange={(e) => { setGstSearch(e.target.value); setGstPage(1); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-40" />
              <input type="month" value={gstFilterPeriod} onChange={(e) => { setGstFilterPeriod(e.target.value); setGstPage(1); }}
                className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none" />
              {(gstSearch || gstFilterPeriod) && <button onClick={() => { setGstSearch(""); setGstFilterPeriod(""); setGstPage(1); }} className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>}
              <button onClick={() => downloadCSV(`gst-register-${user.id}.csv`, gstInvoices.map((i) => ({
                Invoice: i.invoice_number,
                Date: i.issue_date ?? "—",
                Period: i.billing_period ?? "—",
                "Bill To": i.recipient_name ?? (i.flat ? `${i.flat.flat_number}${i.flat.block ? ` (${i.flat.block})` : ""}` : "—"),
                Taxable: Number(i.sub_total ?? 0),
                CGST: Number(i.cgst_total ?? 0),
                SGST: Number(i.sgst_total ?? 0),
                IGST: Number(i.igst_total ?? 0),
                "Total GST": Number(i.gst_amount ?? 0),
                "Invoice Total": Number(i.total_amount ?? 0),
                Status: i.status,
              })))}
                className="rounded-lg border border-brand-300 text-brand-600 px-2.5 py-1.5 text-xs font-semibold cursor-pointer hover:bg-brand-50">⬇ Export CSV</button>
              <span className="ml-auto text-[11px] text-ink-muted">{gstInvoices.length} invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-warm-50 text-left text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide whitespace-nowrap">Invoice</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide whitespace-nowrap">Period</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide whitespace-nowrap">Bill To</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Taxable</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">CGST</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">SGST</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">GST</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gstPaged.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-ink-muted">No taxable invoices found.</td></tr>}
                  {gstPaged.map((i) => (
                    <tr key={i.id} className="border-t border-border-default">
                      <td className="px-3 py-2 font-mono text-ink whitespace-nowrap">{i.invoice_number}</td>
                      <td className="px-3 py-2 text-ink-muted whitespace-nowrap">{i.issue_date ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-muted">{i.billing_period ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-muted whitespace-nowrap">{i.recipient_name ?? (i.flat ? `${i.flat.flat_number}${i.flat.block ? ` (${i.flat.block})` : ""}` : "—")}</td>
                      <td className="px-3 py-2 text-right text-ink">{inr(Number(i.sub_total ?? 0))}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{inr(Number(i.cgst_total ?? 0))}</td>
                      <td className="px-3 py-2 text-right text-ink-muted">{inr(Number(i.sgst_total ?? 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">{inr(Number(i.gst_amount ?? 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">{inr(Number(i.total_amount ?? 0))}</td>
                    </tr>
                  ))}
                  {gstInvoices.length > 0 && (
                    <tr className="border-t-2 border-brand-200 bg-warm-50 font-extrabold">
                      <td colSpan={4} className="px-3 py-2 text-ink">Total ({gstInvoices.length})</td>
                      <td className="px-3 py-2 text-right text-ink">{inr(gstTotals.taxable)}</td>
                      <td className="px-3 py-2 text-right text-ink">{inr(gstTotals.cgst)}</td>
                      <td className="px-3 py-2 text-right text-ink">{inr(gstTotals.sgst)}</td>
                      <td className="px-3 py-2 text-right text-brand-500">{inr(gstTotals.gst)}</td>
                      <td className="px-3 py-2 text-right text-ink">{inr(gstTotals.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {gstTotalPages > 1 && <Pagination page={gstPage} total={gstTotalPages} onChange={setGstPage} />}
          </div>

          {/* GSTR-3B summary (filing helper) */}
          <GstDetailSection userId={user.id} role={user.role} />
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border-default px-3 py-2">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="rounded-lg border border-border-default px-3 py-1 text-xs text-ink disabled:opacity-40 cursor-pointer hover:bg-warm-50">← Prev</button>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => i + 1)
          .filter(p => p === 1 || p === total || Math.abs(p - page) <= 1)
          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) => p === "…"
            ? <span key={`e${i}`} className="px-1.5 py-1 text-xs text-ink-muted">…</span>
            : <button key={p} onClick={() => onChange(p as number)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${p === page ? "bg-brand-500 text-white" : "border border-border-default text-ink hover:bg-warm-50"}`}>{p}</button>
          )}
      </div>
      <button disabled={page === total} onClick={() => onChange(page + 1)}
        className="rounded-lg border border-border-default px-3 py-1 text-xs text-ink disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next →</button>
    </div>
  );
}

function GstDetailSection({ userId, role }: { userId: string; role: string }) {
  const [data, setData] = useState<{ period: string; taxable_outward: number; cgst: number; sgst: number; igst: number; total_tax: number } | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/gst?userId=${userId}&role=${role}&period=${period}`).then(r => r.json()).catch(() => null);
        if (!cancelled && res && !res.error) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, userId, role]);

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
