"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";
import SetupProgressCard from "./SetupProgressCard";

type Summary = {
  totalProperties: number; totalUnits: number; totalTenants: number; totalOwners: number;
  monthlyRevenue: number; outstandingAmount: number; setupPercent: number;
};
type Invoice = {
  id: string; invoice_number: string; invoice_type: string; billing_period: string | null;
  total_amount: number; amount_paid: number; status: string; due_date: string | null;
  flat_id: string | null; landlord_id?: string | null; society_id?: string | null;
  flat: { flat_number: string; block: string | null } | null;
};
type PrefillFlat = {
  flat_id: string; flat_number: string; block: string | null; tenant_id: string | null;
  occupied: boolean; rent: number; maintenance_default: number; last_reading: number;
};
type Row = PrefillFlat & { include: boolean; rentStr: string; maintStr: string; currentStr: string };

type FlatDetail = {
  id: string; flat_number: string; block: string | null; flat_type: string | null;
  floor_number: number | null; area_sqft: number | null; monthly_rent: number | null;
  security_deposit: number | null; status: string; current_tenant_id: string | null;
};
type TenantUser = { full_name: string; phone: string | null; email: string | null };

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisPeriod = () => new Date().toISOString().slice(0, 7);
const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  partially_paid: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
  unpaid: "bg-yellow-100 text-yellow-700",
};

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
  const [editInv, setEditInv] = useState<{ id: string; number: string; flatId: string | null; billingPeriod: string | null; lastReading: number; elecRate: number; hasElec: boolean } | null>(null);
  const [editLines, setEditLines] = useState<{ id: string; description: string; unit_rate: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editElecCurrent, setEditElecCurrent] = useState("");
  const [editMaint, setEditMaint] = useState("");
  // Existing electricity line (for editing reading)
  const [editElecLine, setEditElecLine] = useState<{ id: string; lastReading: number; currentReading: number; elecRate: number; period: string } | null>(null);

  // Filter / search / pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [page, setPage] = useState(1);

  // Flat detail popup
  const [flatPopup, setFlatPopup] = useState<{ flat: FlatDetail; tenant: TenantUser | null; latestInv: Invoice | null } | null>(null);
  const [flatLoading, setFlatLoading] = useState(false);

  // Delete confirm
  const [deleteInv, setDeleteInv] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  useEffect(() => { setPage(1); }, [search, filterStatus, filterPeriod, filterFlat]);

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
    const invalid = cur != null && cur < r.last_reading;
    const units = cur != null && !invalid ? cur - r.last_reading : 0;
    return { rent, maint, units, elec: units * rate, total: rent + maint + (units * rate), invalid };
  };

  const generate = async () => {
    if (!user) return;
    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) { setMsg("Select at least one flat."); return; }
    const badRows = chosen.filter((r) => r.currentStr !== "" && Number(r.currentStr) < r.last_reading);
    if (badRows.length > 0) {
      setMsg(`Current reading cannot be less than last reading for: ${badRows.map((r) => r.flat_number + (r.block ? ` (${r.block})` : "")).join(", ")}`);
      return;
    }
    const hasElecEntry = chosen.some((r) => r.currentStr !== "");
    if (hasElecEntry && rate === 0) {
      setMsg("Please enter the electricity rate (₹/unit) before generating bills with electricity readings.");
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const payload = {
        user: { id: user.id, role: user.role }, billing_period: period,
        elec_rate: rate || undefined,
        flats: chosen.map((r) => ({
          flat_id: r.flat_id, rent: Number(r.rentStr) || 0,
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

    const flatId: string | null = detail.invoice?.flat_id ?? inv.flat_id ?? null;
    const billingPeriod: string | null = detail.invoice?.billing_period ?? inv.billing_period ?? null;
    let lastReading = 0;
    let elecRateVal = rate; // use current rate from state

    if (flatId && billingPeriod) {
      // Fetch all meters for this flat
      const { data: meters } = await supabase.from("meters").select("id").eq("flat_id", flatId).eq("meter_type", "electricity").eq("scope", "unit");
      const meterIds = (meters ?? []).map((m: { id: string }) => m.id);
      if (meterIds.length > 0) {
        const { data: lastR } = await supabase.from("meter_readings").select("current_reading").in("meter_id", meterIds)
          .lt("billing_period", billingPeriod).order("billing_period", { ascending: false }).limit(1).maybeSingle();
        if (lastR) lastReading = Number(lastR.current_reading);
      }
    }

    // Parse existing electricity line if present
    const elecLine = detail.lines.find((l: { description: string }) => l.description?.toLowerCase().includes("electricity"));
    const hasElec = !!elecLine;

    if (elecLine) {
      // Parse: "Electricity — Reading {last} → {current} = {units} units @ ₹{rate}/unit ({period})"
      const m = elecLine.description.match(/Reading\s+(\d+)\s*→\s*(\d+).*?₹([\d.]+)\/unit/);
      const parsedLast = m ? Number(m[1]) : lastReading;
      const parsedCurrent = m ? Number(m[2]) : 0;
      const parsedRate = m ? Number(m[3]) : elecRateVal;
      setEditElecLine({ id: elecLine.id, lastReading: parsedLast, currentReading: parsedCurrent, elecRate: parsedRate, period: billingPeriod ?? "" });
    } else {
      setEditElecLine(null);
    }

    // Non-electricity lines are editable by amount
    setEditLines(detail.lines
      .filter((l: { description: string }) => !l.description?.toLowerCase().includes("electricity"))
      .map((l: { id: string; description: string; unit_rate: number }) => ({ id: l.id, description: l.description, unit_rate: String(l.unit_rate) })));
    setEditElecCurrent("");
    setEditMaint("");
    setEditInv({ id: inv.id, number: inv.invoice_number, flatId, billingPeriod, lastReading, elecRate: elecRateVal, hasElec });
  };

  const confirmDelete = async () => {
    if (!deleteInv) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deleteInv.id}`, { method: "DELETE" });
      if (res.ok) { setDeleteInv(null); await load(); }
      else { const d = await res.json(); setMsg(d.error ?? "Delete failed"); setDeleteInv(null); }
    } finally { setDeleting(false); }
  };

  const saveEdit = async () => {
    if (!editInv || !user) return;
    setEditSaving(true);
    try {
      // 1. Update existing line amounts
      if (editLines.length > 0) {
        const res = await fetch(`/api/invoices/${editInv.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_lines", lines: editLines.map((l) => ({ id: l.id, unit_rate: Number(l.unit_rate) || 0 })) }),
        });
        if (!res.ok) { const d = await res.json(); setMsg(d.error ?? "Edit failed"); return; }
      }

      // 2. Update existing electricity line reading if changed
      if (editElecLine && editElecCurrent !== "" && Number(editElecCurrent) >= editElecLine.lastReading) {
        const newCurrent = Number(editElecCurrent);
        const newUnits = newCurrent - editElecLine.lastReading;
        const newAmount = Math.round(newUnits * editElecLine.elecRate * 100) / 100;
        const monthLabel = editElecLine.period
          ? new Date(`${editElecLine.period}-01`).toLocaleString("en-IN", { month: "long", year: "numeric" })
          : "";
        const newDesc = `Electricity — Reading ${editElecLine.lastReading} → ${newCurrent} = ${newUnits} units @ ₹${editElecLine.elecRate}/unit (${monthLabel})`;
        const elecPatchRes = await fetch(`/api/invoices/${editInv.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_lines", lines: [{ id: editElecLine.id, unit_rate: newAmount, description: newDesc }] }),
        });
        if (!elecPatchRes.ok) { const d = await elecPatchRes.json(); setMsg(d.error ?? "Failed to update electricity"); return; }
      }

      // 3. Append new maintenance + electricity if not already in invoice
      const curReading = Number(editElecCurrent);
      const maintAmt = Number(editMaint);
      const hasNewMaint = editMaint !== "" && maintAmt > 0;
      const hasNewElec = !editElecLine && editElecCurrent !== "" && curReading >= editInv.lastReading;

      if ((hasNewMaint || hasNewElec) && editInv.flatId && editInv.billingPeriod) {
        const payload = {
          user: { id: user.id, role: user.role },
          billing_period: editInv.billingPeriod,
          elec_rate: editInv.elecRate || undefined,
          flats: [{
            flat_id: editInv.flatId, rent: 0,
            maintenance: hasNewMaint ? maintAmt : undefined,
            electricity: hasNewElec ? { current_reading: curReading, last_reading: editInv.lastReading } : undefined,
          }],
        };
        const appendRes = await fetch("/api/invoices/generate-combined", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!appendRes.ok) { const d = await appendRes.json(); setMsg(d.error ?? "Failed to add lines"); return; }
      }

      setEditInv(null); setEditElecCurrent(""); setEditMaint(""); setEditElecLine(null); await load();
    } finally { setEditSaving(false); }
  };

  const openFlatPopup = async (flatId: string | null) => {
    if (!flatId) return;
    setFlatLoading(true);
    try {
      const { data: flat } = await supabase
        .from("flats")
        .select("id, flat_number, block, flat_type, floor_number, area_sqft, monthly_rent, security_deposit, status, current_tenant_id")
        .eq("id", flatId).maybeSingle();
      if (!flat) return;

      let tenant: TenantUser | null = null;
      if (flat.current_tenant_id) {
        const { data: u } = await supabase.from("users").select("full_name, phone, email").eq("id", flat.current_tenant_id).maybeSingle();
        if (u) tenant = u as TenantUser;
      }

      const latestInv = invoices.find((i) => i.flat_id === flatId) ?? null;
      setFlatPopup({ flat: flat as FlatDetail, tenant, latestInv });
    } finally {
      setFlatLoading(false);
    }
  };

  if (!hydrated) return null;
  if (!user) return <div className="p-6 text-sm text-ink-muted">Please log in.</div>;

  // Filtered + paginated invoices
  const filtered = invoices.filter((i) => {
    const flatLabel = i.flat ? `${i.flat.flat_number}${i.flat.block ? ` ${i.flat.block}` : ""}`.toLowerCase() : "";
    const matchSearch = search === "" || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || flatLabel.includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    const matchPeriod = filterPeriod === "" || (i.billing_period ?? "").startsWith(filterPeriod);
    const matchFlat = filterFlat === "" || flatLabel.includes(filterFlat.toLowerCase());
    return matchSearch && matchStatus && matchPeriod && matchFlat;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats: [string, string][] = summary ? [
    ["Properties", String(summary.totalProperties)], ["Units", String(summary.totalUnits)],
    ["Tenants", String(summary.totalTenants)], ["Owners", String(summary.totalOwners)],
    ["This month", inr(summary.monthlyRevenue)], ["Outstanding", inr(summary.outstandingAmount)],
    ["Setup", `${summary.setupPercent}%`],
  ] : [];
  const settingsHref = user.role === "landlord" ? "/landlord/settings" : "/admin/settings";

  return (
    <div className="space-y-5">
      <h2 className="text-[15px] font-extrabold text-ink">🧾 Billing &amp; Invoices</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {!loaded
          ? [...Array(7)].map((_, i) => (
              <div key={i} className="rounded-[14px] border border-border-default bg-white p-3">
                <div className="h-2.5 w-12 rounded bg-warm-100" /><div className="mt-2 h-5 w-10 rounded bg-warm-100" />
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
        {/* Bill builder */}
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
              <span className="ml-2 flex items-center gap-1.5 text-xs text-ink-muted">
                <span className={rate > 0 ? "" : "text-red-500 font-semibold"}>₹/unit:</span>
                <input
                  type="number"
                  value={elecRate}
                  onChange={(e) => setElecRate(e.target.value)}
                  placeholder="e.g. 2"
                  className={`w-20 rounded-lg border px-2 py-1 text-xs text-ink focus:outline-none ${
                    rate > 0 ? "border-border-default bg-warm-50 focus:border-brand-500" : "border-red-400 bg-red-50 focus:border-red-500"
                  }`}
                />
                {rate === 0 && <span className="text-red-500">required for electricity billing</span>}
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
                    const inputCls = `rounded-lg border px-2 py-1 text-xs text-ink focus:outline-none w-24 ${c.invalid ? "border-red-400 bg-red-50 focus:border-red-500" : "border-border-default bg-warm-50 focus:border-brand-500"}`;
                    return (
                      <tr key={r.flat_id} className="border-t border-border-default">
                        <td className="py-1.5 pr-2"><input type="checkbox" checked={r.include} onChange={(e) => setRow(r.flat_id, { include: e.target.checked })} /></td>
                        <td className="py-1.5 pr-2 font-semibold text-ink whitespace-nowrap">
                          {r.flat_number}{r.block ? ` (${r.block})` : ""}
                          {!r.occupied && <span className="ml-1 text-[10px] text-ink-muted">vacant</span>}
                        </td>
                        <td className="py-1.5 pr-2"><input className="rounded-lg border border-border-default bg-warm-50 px-2 py-1 text-xs text-ink focus:outline-none focus:border-brand-500 w-24" type="number" value={r.rentStr} onChange={(e) => setRow(r.flat_id, { rentStr: e.target.value })} /></td>
                        <td className="py-1.5 pr-2"><input className="rounded-lg border border-border-default bg-warm-50 px-2 py-1 text-xs text-ink focus:outline-none focus:border-brand-500 w-24" type="number" placeholder={r.maintenance_default ? String(r.maintenance_default) : "0"} value={r.maintStr} onChange={(e) => setRow(r.flat_id, { maintStr: e.target.value })} /></td>
                        <td className="py-1.5 pr-2 text-ink-muted">{r.last_reading}</td>
                        <td className="py-1.5 pr-2">
                          <input className={inputCls} type="number" placeholder="—" value={r.currentStr} onChange={(e) => setRow(r.flat_id, { currentStr: e.target.value })} />
                          {c.invalid && <div className="mt-0.5 text-[10px] text-red-500">Must be ≥ {r.last_reading}</div>}
                        </td>
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
          {msg && (
            <p className={`mt-2 text-xs ${msg.startsWith("Created") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
          )}
        </div>

        {/* Invoice list */}
        <div className="overflow-hidden rounded-[14px] border border-border-default bg-white">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-3 py-2.5">
            <input type="text" placeholder="Search invoice # or flat…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-44" />
            <input type="text" placeholder="Flat no…" value={filterFlat} onChange={(e) => setFilterFlat(e.target.value)}
              className="rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500 w-24" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500">
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
              className="rounded-lg border border-border-default bg-warm-50 px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-brand-500"
              title="Filter by period" />
            {(search || filterFlat || filterStatus !== "all" || filterPeriod) && (
              <button onClick={() => { setSearch(""); setFilterFlat(""); setFilterStatus("all"); setFilterPeriod(""); }}
                className="text-xs text-ink-muted hover:text-red-500 cursor-pointer">Clear</button>
            )}
            <span className="ml-auto text-[11px] text-ink-muted">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-left text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Invoice</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Flat</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Type</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Period</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide">Total</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide">Outstanding</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!loaded && <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">Loading invoices…</td></tr>}
              {loaded && paginated.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">
                  {filtered.length === 0 && invoices.length > 0 ? "No invoices match the filter." : "No invoices yet."}
                </td></tr>
              )}
              {loaded && paginated.map((i) => (
                <tr key={i.id} className="border-t border-border-default">
                  <td className="px-3 py-2 font-mono text-xs text-ink">{i.invoice_number}</td>
                  <td className="px-3 py-2">
                    {i.flat ? (
                      <button onClick={() => openFlatPopup(i.flat_id)}
                        className="font-semibold text-brand-600 hover:underline cursor-pointer text-xs">
                        {i.flat.flat_number}{i.flat.block ? ` (${i.flat.block})` : ""}
                      </button>
                    ) : <span className="text-xs text-ink-muted">—</span>}
                  </td>
                  <td className="px-3 py-2 capitalize text-ink text-xs">{i.invoice_type}</td>
                  <td className="px-3 py-2 text-ink-muted text-xs">{i.billing_period ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-ink">{inr(i.total_amount)}</td>
                  <td className="px-3 py-2 text-right text-ink">{inr(Number(i.total_amount) - Number(i.amount_paid))}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[i.status] ?? "bg-yellow-100 text-yellow-700"}`}>
                      {i.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a href={`/api/invoices/${i.id}/pdf`} target="_blank" className="font-semibold text-brand-600 hover:underline text-xs">View</a>
                    {i.amount_paid === 0 && i.status !== "cancelled" && i.status !== "paid" && (
                      <button onClick={() => openEdit(i)} className="ml-3 font-semibold text-ink-muted hover:text-ink cursor-pointer text-xs">Edit</button>
                    )}
                    {i.amount_paid === 0 && i.status !== "cancelled" && i.status !== "paid" && (
                      <button onClick={() => setDeleteInv(i)} className="ml-3 font-semibold text-red-500 hover:text-red-700 cursor-pointer text-xs">Delete</button>
                    )}
                    {i.status !== "paid" && i.status !== "cancelled" && user.role !== "landlord" && (
                      <a href={`/api/payment/redirect?invoice=${i.id}`} target="_blank" className="ml-3 font-semibold text-green-600 hover:underline text-xs">Pay</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {loaded && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border-default px-3 py-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border-default px-3 py-1 text-xs text-ink disabled:opacity-40 cursor-pointer hover:bg-warm-50">← Prev</button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${p === page ? "bg-brand-500 text-white" : "border border-border-default text-ink hover:bg-warm-50"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border-default px-3 py-1 text-xs text-ink disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
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

              {/* Existing electricity line — edit reading */}
              {editElecLine && (
                <div className="mt-3 rounded-xl border border-border-default bg-warm-50 p-3">
                  <div className="mb-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Electricity Reading</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-ink-muted">Last rdg: <b>{editElecLine.lastReading}</b></div>
                    <div className="text-xs text-ink-muted">@ ₹{editElecLine.elecRate}/unit</div>
                    <div className="flex-1" />
                    <span className="text-xs text-ink-muted">Current rdg:</span>
                    <input
                      type="number"
                      placeholder={String(editElecLine.currentReading)}
                      defaultValue={editElecLine.currentReading}
                      onChange={(e) => setEditElecCurrent(e.target.value)}
                      className={`w-32 rounded-lg border px-2 py-1.5 text-sm text-ink focus:outline-none ${
                        editElecCurrent !== "" && Number(editElecCurrent) < editElecLine.lastReading
                          ? "border-red-400 bg-red-50"
                          : "border-border-default bg-white focus:border-brand-500"
                      }`}
                    />
                  </div>
                  {editElecCurrent !== "" && Number(editElecCurrent) >= editElecLine.lastReading && (
                    <div className="mt-1.5 text-xs text-green-700">
                      {Number(editElecCurrent) - editElecLine.lastReading} units × ₹{editElecLine.elecRate} = <b>₹{(Number(editElecCurrent) - editElecLine.lastReading) * editElecLine.elecRate}</b>
                    </div>
                  )}
                  {editElecCurrent !== "" && Number(editElecCurrent) < editElecLine.lastReading && (
                    <div className="mt-1 text-xs text-red-500">Must be ≥ {editElecLine.lastReading}</div>
                  )}
                </div>
              )}

              {/* Maintenance section — only if no maintenance line exists */}
              {editInv && !editLines.some((l) => l.description.toLowerCase().includes("maintenance")) && (
                <div className="mt-3 rounded-xl border border-border-default bg-warm-50 p-3">
                  <div className="mb-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Add Maintenance</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted flex-1">Maintenance amount (₹)</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={editMaint}
                      onChange={(e) => setEditMaint(e.target.value)}
                      className="w-32 rounded-lg border border-border-default bg-white px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Electricity section — only if no electricity line already exists */}
              {editInv && !editInv.hasElec && (
                <div className="mt-3 rounded-xl border border-border-default bg-warm-50 p-3">
                  <div className="mb-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Add Electricity</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-ink-muted">Last rdg: <b>{editInv.lastReading}</b></div>
                    <div className="flex-1" />
                    <span className="text-xs text-ink-muted">Current rdg:</span>
                    <input
                      type="number"
                      placeholder="Enter reading"
                      value={editElecCurrent}
                      onChange={(e) => setEditElecCurrent(e.target.value)}
                      className={`w-32 rounded-lg border px-2 py-1.5 text-sm text-ink focus:outline-none ${
                        editElecCurrent !== "" && Number(editElecCurrent) < editInv.lastReading
                          ? "border-red-400 bg-red-50"
                          : "border-border-default bg-white focus:border-brand-500"
                      }`}
                    />
                  </div>
                  {editElecCurrent !== "" && Number(editElecCurrent) >= editInv.lastReading && editInv.elecRate > 0 && (
                    <div className="mt-1.5 text-xs text-green-700">
                      {Number(editElecCurrent) - editInv.lastReading} units × ₹{editInv.elecRate} = <b>₹{(Number(editElecCurrent) - editInv.lastReading) * editInv.elecRate}</b>
                    </div>
                  )}
                  {editElecCurrent !== "" && Number(editElecCurrent) < editInv.lastReading && (
                    <div className="mt-1 text-xs text-red-500">Must be ≥ {editInv.lastReading}</div>
                  )}
                  {editInv.elecRate === 0 && (
                    <div className="mt-1 text-[11px] text-amber-600">Electricity rate not set — <a href="/landlord/settings" className="underline">set in Settings</a></div>
                  )}
                </div>
              )}
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

      {/* Delete confirmation */}
      {deleteInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteInv(null)}>
          <div className="w-full max-w-sm rounded-[18px] bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-3">🗑️</div>
            <div className="text-base font-extrabold text-ink mb-1">Delete Invoice?</div>
            <div className="text-sm text-ink-muted mb-1">
              <strong>{deleteInv.invoice_number}</strong>
              {deleteInv.flat && <> · Flat {deleteInv.flat.flat_number}{deleteInv.flat.block ? ` (${deleteInv.flat.block})` : ""}</>}
            </div>
            <div className="text-xs text-ink-muted mb-4">This invoice will be cancelled and cannot be recovered.</div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteInv(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flat detail popup */}
      {(flatLoading || flatPopup) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4" onClick={() => setFlatPopup(null)}>
          <div className="w-full max-w-md rounded-[18px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            {flatLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-warm-100 animate-pulse" />)}</div>
            ) : flatPopup ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-extrabold text-ink">
                    Flat {flatPopup.flat.flat_number}{flatPopup.flat.block ? ` (${flatPopup.flat.block})` : ""}
                  </div>
                  <button onClick={() => setFlatPopup(null)} className="cursor-pointer text-lg text-ink-muted">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: "TYPE", value: flatPopup.flat.flat_type ?? "—" },
                    { label: "FLOOR", value: flatPopup.flat.floor_number != null ? `Floor ${flatPopup.flat.floor_number}` : "—" },
                    { label: "AREA", value: flatPopup.flat.area_sqft ? `${flatPopup.flat.area_sqft} Sq.Ft` : "—" },
                    { label: "STATUS", value: flatPopup.flat.status },
                    { label: "MONTHLY RENT", value: inr(flatPopup.flat.monthly_rent ?? 0) },
                    { label: "SECURITY DEPOSIT", value: inr(flatPopup.flat.security_deposit ?? 0) },
                  ].map((d) => (
                    <div key={d.label} className="rounded-xl bg-warm-50 p-2.5">
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">{d.label}</div>
                      <div className="mt-0.5 text-sm font-bold capitalize text-ink">{d.value}</div>
                    </div>
                  ))}
                </div>

                {flatPopup.tenant ? (
                  <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Current Tenant</div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-600">
                        {flatPopup.tenant.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink">{flatPopup.tenant.full_name}</div>
                        <div className="text-xs text-ink-muted">{flatPopup.tenant.phone ?? "—"}</div>
                        <div className="text-xs text-ink-muted">{flatPopup.tenant.email ?? "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl border border-dashed border-border-default bg-warm-50 p-3 text-center text-xs text-ink-muted">
                    No tenant — property vacant
                  </div>
                )}

                {flatPopup.latestInv && (
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-border-default bg-warm-50 px-3 py-2.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                        {flatPopup.latestInv.billing_period ?? "Latest"} Invoice
                      </div>
                      <div className="text-base font-extrabold text-ink">{inr(flatPopup.latestInv.total_amount)}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLORS[flatPopup.latestInv.status] ?? "bg-yellow-100 text-yellow-700"}`}>
                      {flatPopup.latestInv.status.replace("_", " ")}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <a href={`/landlord/properties`}
                    className="flex-1 rounded-xl bg-brand-500 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-600">
                    Manage Property
                  </a>
                  {flatPopup.tenant?.phone && (
                    <a href={`https://wa.me/${flatPopup.tenant.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 rounded-xl bg-green-500 py-2.5 text-center text-sm font-bold text-white hover:bg-green-600">
                      WhatsApp
                    </a>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
