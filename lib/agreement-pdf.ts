import { formatCurrency } from "@/lib/utils";

// ─── shared defaults ────────────────────────────────────────────

export const DEFAULT_DOC_BRAND = "MyRentSaathi";
export const DEFAULT_DOC_TITLE = "RENTAL AGREEMENT";
export const DEFAULT_DOC_SUBTITLE = "India's Smartest Rent & Society Management Platform";

export const DEFAULT_SECTION_TITLES = {
  parties: "Parties to the Agreement",
  property: "Property Details",
  financial: "Financial Terms",
  terms: "Terms & Conditions",
};

export type SectionTitles = typeof DEFAULT_SECTION_TITLES;

export const TIER_LABEL: Record<string, string> = {
  free: "Free Draft",
  lawyer_verified: "Lawyer Verified",
  registered: "Registered",
};

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export function durationMonths(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export function defaultClauses(
  ag: { start_date: string; end_date: string; monthly_rent: number; security_deposit: number | null; rent_hike_clause?: string | null },
  societyCity: string | null
): string[] {
  const months = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : "—";
  const clauses = [
    `The Landlord hereby lets and the Tenant hereby takes on rent the property described above for a period of <strong>${months} months</strong>, commencing from <strong>${fmtDate(ag.start_date)}</strong> and ending on <strong>${fmtDate(ag.end_date)}</strong>.`,
    `The Tenant shall pay a monthly rent of <strong>${formatCurrency(ag.monthly_rent)}</strong>, payable on or before the <strong>5th day</strong> of each calendar month. Any delay beyond the 5th shall attract a late fee as mutually agreed.`,
    `A security deposit of <strong>${ag.security_deposit ? formatCurrency(ag.security_deposit) : "Nil"}</strong> has been paid by the Tenant to the Landlord. This deposit shall be refunded within 30 days of vacating, after deducting any dues or damages.`,
  ];
  if (ag.rent_hike_clause) clauses.push(`<strong>Rent Escalation:</strong> ${ag.rent_hike_clause}`);
  clauses.push(
    `The Tenant shall use the premises only for <strong>residential purposes</strong> and shall not sublet, assign, or part with the possession of the premises without prior written consent of the Landlord.`,
    `The Tenant shall maintain the premises in good condition and shall not make any structural alterations. Minor repairs up to ₹500 shall be borne by the Tenant; major repairs shall be the responsibility of the Landlord.`,
    `The Tenant shall pay all utility bills (electricity, water, internet) and maintenance charges applicable to the flat during the tenancy period.`,
    `Either party may terminate this agreement by giving <strong>30 days written notice</strong>. The Tenant shall vacate and hand over peaceful possession of the premises upon expiry or termination.`,
    `Any disputes arising out of this agreement shall be subject to the jurisdiction of courts in <strong>${societyCity ?? "the applicable city"}</strong> and shall be governed by the laws of India.`
  );
  return clauses;
}

// ─── shared PDF template ───────────────────────────────────────

export type AgreementPdfInput = {
  id: string;
  tier: string;
  status: string;
  monthly_rent: number;
  security_deposit: number | null;
  start_date: string;
  end_date: string;
  rent_hike_clause?: string | null;
  clauses?: string[] | null;
  doc_brand?: string | null;
  doc_title?: string | null;
  doc_subtitle?: string | null;
  section_titles?: Partial<SectionTitles> | null;
  flat?: { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  society?: { name: string; city: string; address?: string | null } | null;
  tenantContact?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
  landlordContact?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
};

export function buildAgreementHtml(ag: AgreementPdfInput): string {
  const flat = ag.flat ?? null;
  const society = ag.society ?? null;
  const tenant = ag.tenantContact ?? null;
  const landlord = ag.landlordContact ?? null;

  const docBrand = ag.doc_brand?.trim() || DEFAULT_DOC_BRAND;
  const docTitle = ag.doc_title?.trim() || DEFAULT_DOC_TITLE;
  const docSubtitle = ag.doc_subtitle?.trim() || DEFAULT_DOC_SUBTITLE;
  const sectionTitles: SectionTitles = { ...DEFAULT_SECTION_TITLES, ...(ag.section_titles ?? {}) };
  const clauses = ag.clauses && ag.clauses.length > 0 ? ag.clauses : defaultClauses(ag, society?.city ?? null);

  const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
  const months = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : "—";

  return `<!DOCTYPE html>
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
    <div class="logo">${docBrand}</div>
    <div class="sub">${docSubtitle}</div>
    <div style="margin-top:12px;">
      <span class="ribbon ${ag.status}">${ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}</span>
    </div>
    <h1>${docTitle}</h1>
    <div class="ref">Agreement ID: ${ag.id.slice(0, 8).toUpperCase()} &nbsp;|&nbsp; Type: ${TIER_LABEL[ag.tier] ?? ag.tier} &nbsp;|&nbsp; Generated: ${fmtDate(new Date().toISOString())}</div>
  </div>

  <!-- Parties -->
  <div class="section">
    <div class="section-title">${sectionTitles.parties}</div>
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
    <div class="section-title">${sectionTitles.property}</div>
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
    <div class="section-title">${sectionTitles.financial}</div>
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
    <div class="section-title">${sectionTitles.terms}</div>
    <ol class="clauses">
      ${clauses.map(c => `<li class="clause">${c}</li>`).join("\n      ")}
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
}

export function printAgreementPdf(ag: AgreementPdfInput) {
  const html = buildAgreementHtml(ag);
  const w = window.open("", "_blank", "width=860,height=900");
  if (!w) { throw new Error("POPUP_BLOCKED"); }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
