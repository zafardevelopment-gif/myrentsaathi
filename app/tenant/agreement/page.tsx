"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantAgreement, type TenantAgreement } from "@/lib/tenant-data";
import { TIER_LABEL, fmtDate, durationMonths, defaultClauses, printAgreementPdf, DEFAULT_SECTION_TITLES } from "@/lib/agreement-pdf";

// ─── helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border-green-200",
  expired:    "bg-gray-100 text-gray-500 border-gray-200",
  terminated: "bg-red-100 text-red-600 border-red-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function printAgreement(ag: TenantAgreement) {
  const flat = ag.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society = ag.society as { name: string; city: string; address?: string | null } | null;
  const tenant = ag.tenant_user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;

  try {
    printAgreementPdf({
      ...ag,
      flat,
      society,
      tenantContact: tenant,
      landlordContact: landlord,
    });
  } catch {
    alert("Pop-up blocked. Please allow pop-ups and try again.");
  }
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

      {/* Terms & Conditions */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">
          {agreement.section_titles?.terms ?? DEFAULT_SECTION_TITLES.terms}
        </div>
        <div className="bg-white rounded-[14px] border border-border-default p-4">
          <ol className="list-decimal list-inside space-y-2">
            {(agreement.clauses && agreement.clauses.length > 0
              ? agreement.clauses
              : defaultClauses(agreement, (agreement.society as { city?: string } | null)?.city ?? null)
            ).map((clause, i) => (
              <li key={i} className="text-xs text-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: clause }} />
            ))}
          </ol>
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
