"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantAgreement, type TenantAgreement } from "@/lib/tenant-data";

// ─── helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border-green-200",
  expired:    "bg-gray-100 text-gray-500 border-gray-200",
  terminated: "bg-red-100 text-red-600 border-red-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
};
const TIER_LABEL: Record<string, string> = {
  free: "Free Draft", lawyer_verified: "Lawyer Verified", registered: "Registered",
};
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
function durationMonths(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 30));
}

function printAgreement(ag: TenantAgreement) {
  const flat     = ag.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society  = ag.society as { name: string; city: string; address?: string | null } | null;
  const tenant   = ag.tenant_user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;
  const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
  const months   = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : "—";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Rental Agreement — ${flatLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Georgia',serif;color:#1c1917;background:#fff;font-size:13px;line-height:1.7}
.page{max-width:760px;margin:0 auto;padding:48px 48px 64px}
.header{text-align:center;border-bottom:3px double #1c1917;padding-bottom:20px;margin-bottom:28px}
.header .logo{font-size:22px;font-weight:900;letter-spacing:-.5px;color:#c2660a}
.header .sub{font-size:11px;color:#78716c;margin-top:2px;letter-spacing:1px;text-transform:uppercase}
.header h1{font-size:18px;font-weight:700;margin-top:14px;letter-spacing:.5px}
.header .ref{font-size:10px;color:#78716c;margin-top:4px}
.section{margin-bottom:24px}
.section-title{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#c2660a;border-bottom:1px solid #e7e2dc;padding-bottom:6px;margin-bottom:14px}
.party-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.party-box{border:1px solid #e7e2dc;border-radius:10px;padding:14px;background:#fefbf3}
.party-box .role{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#78716c;margin-bottom:6px}
.party-box .name{font-size:15px;font-weight:700;margin-bottom:4px}
.party-box .detail{font-size:11px;color:#44403c;line-height:1.6}
.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.detail-cell{background:#fdf4e3;border-radius:8px;padding:10px 12px}
.detail-cell .lbl{font-size:9px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:3px}
.detail-cell .val{font-size:13px;font-weight:700}
.clause{font-size:12.5px;color:#1c1917;line-height:1.85;margin-bottom:12px;text-align:justify}
ol.clauses{padding-left:18px}ol.clauses li{margin-bottom:10px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}
.sig-box{border-top:1.5px solid #1c1917;padding-top:10px}
.sig-box .label{font-size:11px;font-weight:700}.sig-box .name{font-size:10px;color:#78716c;margin-top:4px}.sig-box .date{font-size:10px;color:#78716c}
.footer{margin-top:40px;border-top:1px solid #e7e2dc;padding-top:12px;font-size:10px;color:#78716c;text-align:center}
.ribbon{display:inline-block;padding:3px 14px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.ribbon.active{background:#dcfce7;color:#15803d}.ribbon.terminated{background:#fee2e2;color:#dc2626}.ribbon.expired{background:#f3f4f6;color:#6b7280}.ribbon.pending{background:#fef9c3;color:#b45309}
@media print{@page{size:A4;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:28px 36px 48px}}
</style></head><body><div class="page">
<div class="header">
  <div class="logo">MyRentSaathi</div>
  <div class="sub">India's Smartest Rent &amp; Society Management Platform</div>
  <div style="margin-top:12px"><span class="ribbon ${ag.status}">${ag.status.charAt(0).toUpperCase()+ag.status.slice(1)}</span></div>
  <h1>RENTAL AGREEMENT</h1>
  <div class="ref">ID: ${ag.id.slice(0,8).toUpperCase()} &nbsp;|&nbsp; Type: ${TIER_LABEL[ag.tier]??ag.tier} &nbsp;|&nbsp; Generated: ${fmtDate(new Date().toISOString())}</div>
</div>
<div class="section">
  <div class="section-title">Parties to the Agreement</div>
  <div class="party-grid">
    <div class="party-box"><div class="role">🏠 Landlord (Lessor)</div><div class="name">${landlord?.full_name??"—"}</div><div class="detail">${landlord?.phone?`📞 ${landlord.phone}<br/>`:""}${landlord?.email?`✉️ ${landlord.email}`:""}</div></div>
    <div class="party-box"><div class="role">👤 Tenant (Lessee)</div><div class="name">${tenant?.full_name??"—"}</div><div class="detail">${tenant?.phone?`📞 ${tenant.phone}<br/>`:""}${tenant?.email?`✉️ ${tenant.email}`:""}</div></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Property Details</div>
  <div class="detail-grid">
    <div class="detail-cell"><div class="lbl">Flat / Unit</div><div class="val">${flatLabel}</div></div>
    <div class="detail-cell"><div class="lbl">Society / Area</div><div class="val">${society?.name??"Independent"}</div></div>
    <div class="detail-cell"><div class="lbl">City</div><div class="val">${society?.city??"—"}</div></div>
    ${flat?.flat_type?`<div class="detail-cell"><div class="lbl">Type</div><div class="val">${flat.flat_type}</div></div>`:""}
    ${flat?.floor_number!=null?`<div class="detail-cell"><div class="lbl">Floor</div><div class="val">Floor ${flat.floor_number}</div></div>`:""}
    ${flat?.area_sqft?`<div class="detail-cell"><div class="lbl">Area</div><div class="val">${flat.area_sqft} sq.ft</div></div>`:""}
  </div>
</div>
<div class="section">
  <div class="section-title">Financial Terms</div>
  <div class="detail-grid">
    <div class="detail-cell"><div class="lbl">Monthly Rent</div><div class="val" style="color:#c2660a">${formatCurrency(ag.monthly_rent)}</div></div>
    <div class="detail-cell"><div class="lbl">Security Deposit</div><div class="val">${ag.security_deposit?formatCurrency(ag.security_deposit):"—"}</div></div>
    <div class="detail-cell"><div class="lbl">Duration</div><div class="val">${months} months</div></div>
    <div class="detail-cell"><div class="lbl">Start Date</div><div class="val">${fmtDate(ag.start_date)}</div></div>
    <div class="detail-cell"><div class="lbl">End Date</div><div class="val">${fmtDate(ag.end_date)}</div></div>
    <div class="detail-cell"><div class="lbl">Total Value</div><div class="val">${typeof months==="number"?formatCurrency(ag.monthly_rent*months):"—"}</div></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Terms &amp; Conditions</div>
  <ol class="clauses">
    <li class="clause">The Landlord hereby lets and the Tenant hereby takes on rent the above property for <strong>${months} months</strong>, from <strong>${fmtDate(ag.start_date)}</strong> to <strong>${fmtDate(ag.end_date)}</strong>.</li>
    <li class="clause">The Tenant shall pay a monthly rent of <strong>${formatCurrency(ag.monthly_rent)}</strong>, payable on or before the <strong>5th day</strong> of each month. Late payment shall attract a fee as mutually agreed.</li>
    <li class="clause">A security deposit of <strong>${ag.security_deposit?formatCurrency(ag.security_deposit):"Nil"}</strong> has been paid. This shall be refunded within 30 days of vacating, after deducting any dues or damages.</li>
    <li class="clause">The Tenant shall use the premises only for <strong>residential purposes</strong> and shall not sublet without prior written consent of the Landlord.</li>
    <li class="clause">The Tenant shall maintain the premises in good condition. Minor repairs up to ₹500 shall be borne by the Tenant; major repairs by the Landlord.</li>
    <li class="clause">The Tenant shall pay all utility bills (electricity, water, internet) and applicable maintenance charges during the tenancy.</li>
    <li class="clause">Either party may terminate this agreement by giving <strong>30 days written notice</strong>.</li>
    <li class="clause">Disputes shall be subject to the jurisdiction of courts in <strong>${society?.city??"the applicable city"}</strong> and governed by the laws of India.</li>
  </ol>
</div>
<div class="sig-grid">
  <div class="sig-box"><div class="label">Landlord's Signature</div><div class="name">${landlord?.full_name??"—"}</div><div class="date">Date: _______________________</div></div>
  <div class="sig-box"><div class="label">Tenant's Signature</div><div class="name">${tenant?.full_name??"—"}</div><div class="date">Date: _______________________</div></div>
</div>
<div class="footer">Generated via MyRentSaathi. For legal enforceability, get it notarised or registered at the Sub-Registrar's office.<br/>© ${new Date().getFullYear()} MyRentSaathi</div>
</div></body></html>`;

  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) { alert("Pop-up blocked. Please allow pop-ups and try again."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

// ─── Component ───────────────────────────────────────────────

export default function TenantAgreementPage() {
  const { user } = useAuth();
  const [agreement, setAgreement] = useState<TenantAgreement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    getTenantAgreement(user.email)
      .then(ag => { setAgreement(ag); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  if (!agreement) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📄</div>
        <div className="text-base font-bold text-ink">No active agreement found</div>
        <div className="text-xs text-ink-muted mt-2">Your landlord hasn't created a rental agreement yet.<br/>Please contact your landlord.</div>
      </div>
    );
  }

  const flat     = agreement.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society  = agreement.society as { name: string; city: string } | null;
  const landlord = agreement.landlord as { full_name?: string; phone?: string; email?: string } | null;
  const tenant   = agreement.tenant_user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const months   = agreement.start_date && agreement.end_date ? durationMonths(agreement.start_date, agreement.end_date) : null;
  const flatLabel = flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
  const daysLeft  = agreement.end_date ? Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">📄 Rental Agreement</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">Your active rental agreement</p>
        </div>
        <button
          onClick={() => printAgreement(agreement)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center gap-1.5"
        >
          ⬇ Download PDF
        </button>
      </div>

      {/* Status + ID */}
      <div className="bg-white rounded-[16px] border border-border-default p-4 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">📄</div>
          <div>
            <div className="text-sm font-extrabold text-ink">Agreement #{agreement.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[11px] text-ink-muted">{TIER_LABEL[agreement.tier] ?? agreement.tier} · Created {fmtDate(agreement.id ? undefined : undefined)}</div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[agreement.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
          {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
        </span>
      </div>

      {/* Expiry warning */}
      {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
        <div className="bg-orange-50 border border-orange-200 rounded-[12px] px-4 py-2.5 mb-3 text-[11px] text-orange-700 font-semibold">
          ⚠️ Agreement expires in {daysLeft} days — contact your landlord to renew.
        </div>
      )}
      {daysLeft !== null && daysLeft <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-2.5 mb-3 text-[11px] text-red-700 font-semibold">
          🔴 Agreement has expired — contact your landlord immediately.
        </div>
      )}

      {/* Parties */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">Parties</div>
        <div className="grid grid-cols-2 gap-3">
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
          <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-extrabold text-blue-800">
                {tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "T"}
              </div>
              <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Tenant (You)</div>
            </div>
            <div className="text-sm font-extrabold text-ink">{tenant?.full_name ?? user?.name ?? "—"}</div>
            {tenant?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {tenant.phone}</div>}
            {tenant?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {tenant.email}</div>}
          </div>
        </div>
      </div>

      {/* Property */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">Property</div>
        <div className="bg-white rounded-[14px] border border-border-default p-4">
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
              { label: "Type",  value: flat?.flat_type ?? "—" },
              { label: "Floor", value: flat?.floor_number != null ? `Floor ${flat.floor_number}` : "—" },
              { label: "Area",  value: flat?.area_sqft ? `${flat.area_sqft} sq.ft` : "—" },
            ].map(d => (
              <div key={d.label} className="bg-warm-50 rounded-xl p-2 text-center border border-border-default">
                <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                <div className="text-xs font-bold text-ink mt-0.5">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Terms */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">Financial Terms</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Monthly Rent",     value: formatCurrency(agreement.monthly_rent),                                  highlight: true },
            { label: "Security Deposit", value: agreement.security_deposit ? formatCurrency(agreement.security_deposit) : "—", highlight: false },
            { label: "Start Date",       value: fmtDate(agreement.start_date),                                           highlight: false },
            { label: "End Date",         value: fmtDate(agreement.end_date),                                             highlight: false },
            { label: "Duration",         value: months ? `${months} months` : "—",                                       highlight: false },
            { label: "Total Value",      value: months ? formatCurrency(agreement.monthly_rent * months) : "—",           highlight: false },
          ].map(d => (
            <div key={d.label} className={`rounded-[12px] p-3 border ${d.highlight ? "bg-brand-50 border-brand-200" : "bg-warm-50 border-border-default"}`}>
              <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
              <div className={`text-sm font-extrabold mt-0.5 ${d.highlight ? "text-brand-600" : "text-ink"}`}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Document from Landlord */}
      {agreement.custom_doc_url && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">Document from Landlord</div>
          <div className="bg-purple-50 border border-purple-200 rounded-[14px] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl flex-shrink-0">📎</div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink truncate">{agreement.custom_doc_name ?? "Custom Agreement Document"}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">Attached by your landlord</div>
              </div>
            </div>
            <a
              href={agreement.custom_doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold cursor-pointer hover:bg-purple-600 transition-colors"
            >
              ⬇ Download
            </a>
          </div>
        </div>
      )}

      {/* Download CTA */}
      <button
        onClick={() => printAgreement(agreement)}
        className="w-full py-3.5 rounded-[14px] bg-brand-500 text-white text-sm font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 mt-2"
      >
        ⬇ Download Agreement as PDF
      </button>
      <p className="text-center text-[10px] text-ink-muted mt-2">
        For legal enforceability, get the agreement notarised or registered at the Sub-Registrar's office.
      </p>
    </div>
  );
}
