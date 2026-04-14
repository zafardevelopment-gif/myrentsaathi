"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getLandlordAgreements, getLandlordFlats, getLandlordUserId,
  type LandlordAgreement, type LandlordFlat,
} from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border-green-200",
  expired:    "bg-gray-100 text-gray-500 border-gray-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  terminated: "bg-red-100 text-red-600 border-red-200",
};

const TIER_LABEL: Record<string, string> = {
  free:             "Free Draft",
  lawyer_verified:  "Lawyer Verified",
  registered:       "Registered",
};

const TIERS = [
  { value: "free",            label: "Free Draft" },
  { value: "lawyer_verified", label: "Lawyer Verified (₹499)" },
  { value: "registered",      label: "Registered (₹999)" },
];

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function durationMonths(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

// ─── PDF print ──────────────────────────────────────────────

function printAgreement(ag: LandlordAgreement) {
  const flat    = ag.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society = ag.society as { name: string; city: string; address?: string | null } | null;
  const tenant  = ag.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;

  const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
  const months = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : "—";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Rental Agreement — ${flatLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; color: #1c1917; background: #fff; font-size: 13px; line-height: 1.7; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 48px 64px; }

  /* Header */
  .header { text-align: center; border-bottom: 3px double #1c1917; padding-bottom: 20px; margin-bottom: 28px; }
  .header .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #c2660a; }
  .header .sub { font-size: 11px; color: #78716c; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .header h1 { font-size: 18px; font-weight: 700; margin-top: 14px; letter-spacing: 0.5px; }
  .header .ref { font-size: 10px; color: #78716c; margin-top: 4px; }

  /* Sections */
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    color: #c2660a; border-bottom: 1px solid #e7e2dc; padding-bottom: 6px; margin-bottom: 14px; }

  /* Party cards */
  .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .party-box { border: 1px solid #e7e2dc; border-radius: 10px; padding: 14px; background: #fefbf3; }
  .party-box .role { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #78716c; margin-bottom: 6px; }
  .party-box .name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .party-box .detail { font-size: 11px; color: #44403c; line-height: 1.6; }

  /* Detail grid */
  .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .detail-cell { background: #fdf4e3; border-radius: 8px; padding: 10px 12px; }
  .detail-cell .lbl { font-size: 9px; color: #78716c; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 3px; }
  .detail-cell .val { font-size: 13px; font-weight: 700; }

  /* Clause body */
  .clause { font-size: 12.5px; color: #1c1917; line-height: 1.85; margin-bottom: 12px; text-align: justify; }
  .clause strong { font-weight: 700; }
  ol.clauses { padding-left: 18px; }
  ol.clauses li { margin-bottom: 10px; }

  /* Signatures */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
  .sig-box { border-top: 1.5px solid #1c1917; padding-top: 10px; }
  .sig-box .label { font-size: 11px; font-weight: 700; }
  .sig-box .name  { font-size: 10px; color: #78716c; margin-top: 4px; }
  .sig-box .date  { font-size: 10px; color: #78716c; }

  /* Footer */
  .footer { margin-top: 40px; border-top: 1px solid #e7e2dc; padding-top: 12px;
    font-size: 10px; color: #78716c; text-align: center; }

  /* Status ribbon */
  .ribbon { display: inline-block; padding: 3px 14px; border-radius: 20px; font-size: 10px;
    font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .ribbon.active     { background: #dcfce7; color: #15803d; }
  .ribbon.terminated { background: #fee2e2; color: #dc2626; }
  .ribbon.expired    { background: #f3f4f6; color: #6b7280; }
  .ribbon.pending    { background: #fef9c3; color: #b45309; }

  @media print {
    @page { size: A4; margin: 0; }
    body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 28px 36px 48px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo">MyRentSaathi</div>
    <div class="sub">India's Smartest Rent &amp; Society Management Platform</div>
    <div style="margin-top:12px;">
      <span class="ribbon ${ag.status}">${ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}</span>
    </div>
    <h1>RENTAL AGREEMENT</h1>
    <div class="ref">Agreement ID: ${ag.id.slice(0, 8).toUpperCase()} &nbsp;|&nbsp; Type: ${TIER_LABEL[ag.tier] ?? ag.tier} &nbsp;|&nbsp; Generated: ${fmtDate(new Date().toISOString())}</div>
  </div>

  <!-- Parties -->
  <div class="section">
    <div class="section-title">Parties to the Agreement</div>
    <div class="party-grid">
      <div class="party-box">
        <div class="role">🏠 Landlord (Lessor)</div>
        <div class="name">${landlord?.full_name ?? "—"}</div>
        <div class="detail">
          ${landlord?.phone ? `📞 ${landlord.phone}<br/>` : ""}
          ${landlord?.email ? `✉️ ${landlord.email}` : ""}
        </div>
      </div>
      <div class="party-box">
        <div class="role">👤 Tenant (Lessee)</div>
        <div class="name">${tenant?.full_name ?? "—"}</div>
        <div class="detail">
          ${tenant?.phone ? `📞 ${tenant.phone}<br/>` : ""}
          ${tenant?.email ? `✉️ ${tenant.email}` : ""}
        </div>
      </div>
    </div>
  </div>

  <!-- Property Details -->
  <div class="section">
    <div class="section-title">Property Details</div>
    <div class="detail-grid">
      <div class="detail-cell"><div class="lbl">Flat / Unit</div><div class="val">${flatLabel}</div></div>
      <div class="detail-cell"><div class="lbl">Society / Area</div><div class="val">${society?.name ?? "Independent"}</div></div>
      <div class="detail-cell"><div class="lbl">City</div><div class="val">${society?.city ?? "—"}</div></div>
      ${flat?.flat_type ? `<div class="detail-cell"><div class="lbl">Type</div><div class="val">${flat.flat_type}</div></div>` : ""}
      ${flat?.floor_number != null ? `<div class="detail-cell"><div class="lbl">Floor</div><div class="val">Floor ${flat.floor_number}</div></div>` : ""}
      ${flat?.area_sqft ? `<div class="detail-cell"><div class="lbl">Area</div><div class="val">${flat.area_sqft} sq.ft</div></div>` : ""}
      ${society?.address ? `<div class="detail-cell" style="grid-column:span 3"><div class="lbl">Address</div><div class="val">${society.address}</div></div>` : ""}
    </div>
  </div>

  <!-- Financial Terms -->
  <div class="section">
    <div class="section-title">Financial Terms</div>
    <div class="detail-grid">
      <div class="detail-cell"><div class="lbl">Monthly Rent</div><div class="val" style="color:#c2660a">${formatCurrency(ag.monthly_rent)}</div></div>
      <div class="detail-cell"><div class="lbl">Security Deposit</div><div class="val">${ag.security_deposit ? formatCurrency(ag.security_deposit) : "—"}</div></div>
      <div class="detail-cell"><div class="lbl">Duration</div><div class="val">${months} months</div></div>
      <div class="detail-cell"><div class="lbl">Start Date</div><div class="val">${fmtDate(ag.start_date)}</div></div>
      <div class="detail-cell"><div class="lbl">End Date</div><div class="val">${fmtDate(ag.end_date)}</div></div>
      <div class="detail-cell"><div class="lbl">Total Rent Value</div><div class="val">${typeof months === "number" ? formatCurrency(ag.monthly_rent * months) : "—"}</div></div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div class="section">
    <div class="section-title">Terms &amp; Conditions</div>
    <ol class="clauses">
      <li class="clause">The Landlord hereby lets and the Tenant hereby takes on rent the property described above for a period of <strong>${months} months</strong>, commencing from <strong>${fmtDate(ag.start_date)}</strong> and ending on <strong>${fmtDate(ag.end_date)}</strong>.</li>
      <li class="clause">The Tenant shall pay a monthly rent of <strong>${formatCurrency(ag.monthly_rent)}</strong>, payable on or before the <strong>5th day</strong> of each calendar month. Any delay beyond the 5th shall attract a late fee as mutually agreed.</li>
      <li class="clause">A security deposit of <strong>${ag.security_deposit ? formatCurrency(ag.security_deposit) : "Nil"}</strong> has been paid by the Tenant to the Landlord. This deposit shall be refunded within 30 days of vacating, after deducting any dues or damages.</li>
      <li class="clause">The Tenant shall use the premises only for <strong>residential purposes</strong> and shall not sublet, assign, or part with the possession of the premises without prior written consent of the Landlord.</li>
      <li class="clause">The Tenant shall maintain the premises in good condition and shall not make any structural alterations. Minor repairs up to ₹500 shall be borne by the Tenant; major repairs shall be the responsibility of the Landlord.</li>
      <li class="clause">The Tenant shall pay all utility bills (electricity, water, internet) and maintenance charges applicable to the flat during the tenancy period.</li>
      <li class="clause">Either party may terminate this agreement by giving <strong>30 days written notice</strong>. The Tenant shall vacate and hand over peaceful possession of the premises upon expiry or termination.</li>
      <li class="clause">Any disputes arising out of this agreement shall be subject to the jurisdiction of courts in <strong>${society?.city ?? "the applicable city"}</strong> and shall be governed by the laws of India.</li>
    </ol>
  </div>

  <!-- Signatures -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="label">Landlord's Signature</div>
      <div class="name">${landlord?.full_name ?? "—"}</div>
      <div class="date">Date: _______________________</div>
    </div>
    <div class="sig-box">
      <div class="label">Tenant's Signature</div>
      <div class="name">${tenant?.full_name ?? "—"}</div>
      <div class="date">Date: _______________________</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    This agreement is generated via MyRentSaathi. For legal enforceability, please get it notarised or registered at the local Sub-Registrar's office.
    <br/>© ${new Date().getFullYear()} MyRentSaathi — All rights reserved.
  </div>
</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) { toast.error("Pop-up blocked. Allow pop-ups and try again."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

// ─── Main Component ──────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export default function LandlordAgreements() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewAg, setViewAg] = useState<LandlordAgreement | null>(null);
  const [terminating, setTerminating] = useState(false);

  // Custom document upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docRemoving, setDocRemoving] = useState(false);

  // Filters
  const [filterTenant, setFilterTenant] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    flat_id: "", tenant_user_id: "", tier: "free",
    start_date: "", end_date: "",
    monthly_rent: "", security_deposit: "",
  });

  async function loadData() {
    if (!user?.email) return;
    const [ag, f, lid] = await Promise.all([
      getLandlordAgreements(user.email).catch(() => [] as LandlordAgreement[]),
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setAgreements(ag);
    setFlats(f);
    setLandlordId(lid);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, [user]);

  function onFlatChange(flatId: string) {
    const flat = flats.find(f => f.id === flatId);
    setForm(f => ({
      ...f,
      flat_id: flatId,
      tenant_user_id: flat?.current_tenant_id ?? "",
      monthly_rent: flat?.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent,
      security_deposit: flat?.security_deposit ? String(flat.security_deposit) : f.security_deposit,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId || !form.flat_id) return;
    const selectedFlat = flats.find(f => f.id === form.flat_id);
    setSaving(true);

    let tenantRecordId: string | null = null;
    if (form.flat_id) {
      const { data: tenantRec } = await supabase
        .from("tenants").select("id")
        .eq("flat_id", form.flat_id).eq("status", "active").maybeSingle();
      tenantRecordId = tenantRec?.id ?? null;
    }

    const { error } = await supabase.from("agreements").insert({
      landlord_id: landlordId,
      flat_id: form.flat_id,
      society_id: selectedFlat?.society_id ?? null,
      tenant_id: tenantRecordId,
      tier: form.tier,
      agreement_type: form.tier,
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: Number(form.monthly_rent),
      security_deposit: Number(form.security_deposit) || null,
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Agreement created!");
    setForm({ flat_id: "", tenant_user_id: "", tier: "free", start_date: "", end_date: "", monthly_rent: "", security_deposit: "" });
    setShowForm(false);
    setLoading(true);
    await loadData();
  }

  async function handleTerminate(agId: string) {
    setTerminating(true);
    await supabase.from("agreements").update({ status: "terminated" }).eq("id", agId);
    toast.success("Agreement terminated.");
    setTerminating(false);
    setViewAg(null);
    setLoading(true);
    await loadData();
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!viewAg || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB."); return; }
    setDocUploading(true);
    const path = `agreements/${viewAg.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("agreements-docs").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed: " + upErr.message); setDocUploading(false); return; }
    const { data: urlData } = supabase.storage.from("agreements-docs").getPublicUrl(path);
    const publicUrl = urlData?.publicUrl ?? null;
    const { error: dbErr } = await supabase.from("agreements")
      .update({ custom_doc_url: publicUrl, custom_doc_name: file.name })
      .eq("id", viewAg.id);
    if (dbErr) { toast.error("Failed to save document link."); setDocUploading(false); return; }
    const updated = { ...viewAg, custom_doc_url: publicUrl, custom_doc_name: file.name };
    setViewAg(updated);
    setAgreements(prev => prev.map(a => a.id === viewAg.id ? updated : a));
    toast.success("Document uploaded!");
    setDocUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDocRemove() {
    if (!viewAg?.custom_doc_url) return;
    setDocRemoving(true);
    await supabase.from("agreements")
      .update({ custom_doc_url: null, custom_doc_name: null })
      .eq("id", viewAg.id);
    const updated = { ...viewAg, custom_doc_url: null, custom_doc_name: null };
    setViewAg(updated);
    setAgreements(prev => prev.map(a => a.id === viewAg.id ? updated : a));
    toast.success("Document removed.");
    setDocRemoving(false);
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1 uppercase tracking-wide";

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">📄 Rental Agreements</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{agreements.length} agreement{agreements.length !== 1 ? "s" : ""} found</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5">
          {showForm ? "✕ Cancel" : "+ New Agreement"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[16px] p-5 border border-brand-200 mb-5 shadow-sm">
          <div className="text-sm font-extrabold text-ink mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-base">📝</span>
            New Rental Agreement
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Select Flat *</label>
              <select required className={inputClass} value={form.flat_id} onChange={e => onFlatChange(e.target.value)}>
                <option value="">— Choose a flat —</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number}{f.block ? ` (${f.block})` : ""}{f.flat_type ? ` · ${f.flat_type}` : ""} {f.current_tenant_id ? "🟢 Occupied" : "⚪ Vacant"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Agreement Type</label>
              <select className={inputClass} value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input required type="date" className={inputClass} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>End Date *</label>
                <input required type="date" className={inputClass} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monthly Rent (₹) *</label>
                <input required type="number" className={inputClass} placeholder="25000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Security Deposit (₹)</label>
                <input type="number" className={inputClass} placeholder="50000" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} />
              </div>
            </div>

            {flats.filter(f => f.current_tenant_id).length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-[11px] text-yellow-700">
                ⚠️ No occupied flats found. Add a tenant first to create an agreement.
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60 mt-1">
              {saving ? "Creating..." : "✓ Create Agreement"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      {agreements.length > 0 && (
        <div className="bg-white rounded-[14px] border border-border-default p-3.5 mb-4">
          <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">Filters</div>
          <div className="flex gap-2 flex-wrap">
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 flex-1 min-w-[130px]"
              placeholder="🔍 Tenant name..."
              value={filterTenant} onChange={e => { setFilterTenant(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-28"
              placeholder="Flat no."
              value={filterFlat} onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-36"
              placeholder="Society / city..."
              value={filterSociety} onChange={e => { setFilterSociety(e.target.value); setPage(1); }}
            />
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="pending">Pending</option>
            </select>
            {(filterTenant || filterFlat || filterSociety || filterStatus) && (
              <button
                onClick={() => { setFilterTenant(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer"
              >Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Agreement List */}
      {(() => {
        const filtered = agreements.filter(ag => {
          const tenant  = ag.tenant?.user as { full_name: string } | null;
          const flat    = ag.flat as { flat_number: string; block: string | null } | null;
          const society = ag.society as { name: string; city: string } | null;
          const tName = tenant?.full_name ?? "";
          const fLabel = flat ? `${flat.flat_number} ${flat.block ?? ""}` : "";
          const sLabel = society ? `${society.name} ${society.city}` : "";
          if (filterTenant && !tName.toLowerCase().includes(filterTenant.toLowerCase())) return false;
          if (filterFlat && !fLabel.toLowerCase().includes(filterFlat.toLowerCase())) return false;
          if (filterSociety && !sLabel.toLowerCase().includes(filterSociety.toLowerCase())) return false;
          if (filterStatus && ag.status !== filterStatus) return false;
          return true;
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

        if (agreements.length === 0) return (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-sm font-semibold">No agreements yet</div>
            <div className="text-xs mt-1">Click "+ New Agreement" to generate your first one</div>
          </div>
        );

        return (
          <>
            {/* Count + page size */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div className="text-xs text-ink-muted">{filtered.length} of {agreements.length} agreements</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">Show</span>
                <select className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
                  value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[11px] text-ink-muted">per page</span>
              </div>
            </div>

            {paged.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-sm">No agreements match your filters.</div>
            ) : (
        <div className="space-y-2">
          {paged.map((ag) => {
            const flat    = ag.flat as { flat_number: string; block: string | null } | null;
            const society = ag.society as { name: string; city: string } | null;
            const tenant  = ag.tenant?.user as { full_name: string } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            const daysLeft = ag.end_date ? Math.ceil((new Date(ag.end_date).getTime() - Date.now()) / 86400000) : null;
            const months = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : null;

            return (
              <div key={ag.id} className="bg-white rounded-[14px] p-4 border border-border-default hover:border-brand-200 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-xl flex-shrink-0">📄</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-ink">{flatLabel}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[ag.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warm-100 text-ink-muted border border-border-default">
                          {TIER_LABEL[ag.tier] ?? ag.tier}
                        </span>
                      </div>
                      {tenant && <div className="text-[11px] text-ink-muted mt-0.5">👤 {tenant.full_name}</div>}
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        📅 {fmtDate(ag.start_date)} → {fmtDate(ag.end_date)}
                        {months ? ` · ${months} months` : ""}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        💰 {formatCurrency(ag.monthly_rent)}/mo
                        {ag.security_deposit ? ` · Deposit: ${formatCurrency(ag.security_deposit)}` : ""}
                        {society ? ` · ${society.name}` : ""}
                      </div>
                      {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && ag.status === "active" && (
                        <div className="text-[10px] text-orange-600 font-bold mt-1">⚠️ Expires in {daysLeft} days</div>
                      )}
                      {daysLeft !== null && daysLeft <= 0 && ag.status === "active" && (
                        <div className="text-[10px] text-red-600 font-bold mt-1">🔴 Lease has expired</div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setViewAg(ag)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl border border-border-default text-[11px] font-bold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors">
                    View →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => p === "..." ? (
                    <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="text-center text-[10px] text-ink-muted mt-2">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </div>
            )}
          </>
        );
      })()}

      {/* ─── PROFESSIONAL AGREEMENT MODAL ─────────────────────── */}
      {viewAg && (() => {
        const flat     = viewAg.flat    as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
        const society  = viewAg.society as { name: string; city: string; address?: string | null } | null;
        const tenant   = viewAg.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
        const landlord = viewAg.landlord as { full_name?: string; phone?: string; email?: string } | null;
        const months   = viewAg.start_date && viewAg.end_date ? durationMonths(viewAg.start_date, viewAg.end_date) : null;
        const flatLabel = flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-3 md:p-6"
            onClick={() => setViewAg(null)}>
            <div className="bg-white rounded-[20px] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="sticky top-0 bg-white rounded-t-[20px] border-b border-border-default px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-lg">📄</div>
                  <div>
                    <div className="text-sm font-extrabold text-ink">Rental Agreement</div>
                    <div className="text-[10px] text-ink-muted">#{viewAg.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[viewAg.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {viewAg.status.charAt(0).toUpperCase() + viewAg.status.slice(1)}
                  </span>
                  <button onClick={() => setViewAg(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-muted hover:bg-warm-50 cursor-pointer text-lg">✕</button>
                </div>
              </div>

              <div className="px-5 py-4 space-y-5">

                {/* Parties */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Parties</div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Landlord */}
                    <div className="bg-green-50 border border-green-100 rounded-[14px] p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800">
                          {landlord?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "L"}
                        </div>
                        <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Landlord</div>
                      </div>
                      <div className="text-sm font-extrabold text-ink">{landlord?.full_name ?? "—"}</div>
                      {landlord?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {landlord.phone}</div>}
                      {landlord?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {landlord.email}</div>}
                    </div>
                    {/* Tenant */}
                    <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-extrabold text-blue-800">
                          {tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "T"}
                        </div>
                        <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Tenant</div>
                      </div>
                      <div className="text-sm font-extrabold text-ink">{tenant?.full_name ?? "—"}</div>
                      {tenant?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {tenant.phone}</div>}
                      {tenant?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {tenant.email}</div>}
                    </div>
                  </div>
                </div>

                {/* Property */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Property</div>
                  <div className="bg-warm-50 rounded-[14px] border border-border-default p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">🏠</div>
                      <div>
                        <div className="text-sm font-extrabold text-ink">Flat {flatLabel}</div>
                        <div className="text-[11px] text-ink-muted">
                          {society ? `${society.name}, ${society.city}` : "Independent Property"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Type",     value: flat?.flat_type ?? "—" },
                        { label: "Floor",    value: flat?.floor_number != null ? `Floor ${flat.floor_number}` : "—" },
                        { label: "Area",     value: flat?.area_sqft ? `${flat.area_sqft} sq.ft` : "—" },
                      ].map(d => (
                        <div key={d.label} className="bg-white rounded-xl p-2 text-center border border-border-default">
                          <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                          <div className="text-xs font-bold text-ink mt-0.5">{d.value}</div>
                        </div>
                      ))}
                    </div>
                    {society?.address && (
                      <div className="text-[10px] text-ink-muted mt-2">📍 {society.address}</div>
                    )}
                  </div>
                </div>

                {/* Financial Terms */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Financial Terms</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Monthly Rent",     value: formatCurrency(viewAg.monthly_rent),                    highlight: true },
                      { label: "Security Deposit", value: viewAg.security_deposit ? formatCurrency(viewAg.security_deposit) : "—", highlight: false },
                      { label: "Start Date",       value: fmtDate(viewAg.start_date),                             highlight: false },
                      { label: "End Date",         value: fmtDate(viewAg.end_date),                               highlight: false },
                      { label: "Duration",         value: months ? `${months} months` : "—",                     highlight: false },
                      { label: "Total Value",      value: months ? formatCurrency(viewAg.monthly_rent * months) : "—", highlight: false },
                    ].map(d => (
                      <div key={d.label} className={`rounded-[12px] p-3 border ${d.highlight ? "bg-brand-50 border-brand-200" : "bg-warm-50 border-border-default"}`}>
                        <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                        <div className={`text-sm font-extrabold mt-0.5 ${d.highlight ? "text-brand-600" : "text-ink"}`}>{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agreement type + ID */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    Type: {TIER_LABEL[viewAg.tier] ?? viewAg.tier}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    ID: {viewAg.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    Created: {fmtDate(viewAg.created_at)}
                  </span>
                </div>

                {/* ── Custom Document ── */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Custom Document</div>
                  {viewAg.custom_doc_url ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-[14px] p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-lg flex-shrink-0">📎</div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink truncate">{viewAg.custom_doc_name ?? "Custom Document"}</div>
                          <div className="text-[10px] text-ink-muted mt-0.5">Visible to tenant</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={viewAg.custom_doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer hover:bg-purple-200 transition-colors"
                        >
                          View
                        </a>
                        <button
                          onClick={handleDocRemove}
                          disabled={docRemoving}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-500 text-[11px] font-bold cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {docRemoving ? "..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border-default rounded-[14px] p-4 text-center">
                      <div className="text-2xl mb-1">📎</div>
                      <div className="text-xs font-semibold text-ink mb-0.5">Attach your own agreement document</div>
                      <div className="text-[10px] text-ink-muted mb-3">PDF, Word, or image · Max 10 MB · Tenant will be able to view &amp; download it</div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleDocUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={docUploading}
                        className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold cursor-pointer hover:bg-purple-600 transition-colors disabled:opacity-50"
                      >
                        {docUploading ? "Uploading..." : "Upload Document"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="sticky bottom-0 bg-white rounded-b-[20px] border-t border-border-default px-5 py-3.5 flex gap-2">
                <button onClick={() => setViewAg(null)}
                  className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer hover:bg-warm-200 transition-colors">
                  Close
                </button>
                <button onClick={() => printAgreement(viewAg)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5">
                  ⬇ Download PDF
                </button>
                {viewAg.status === "active" && (
                  <button onClick={() => handleTerminate(viewAg.id)} disabled={terminating}
                    className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-60">
                    {terminating ? "..." : "Terminate"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
