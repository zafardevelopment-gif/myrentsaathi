"use client";

import { formatCurrency } from "@/lib/utils";
import { MOCK_FLATS, MOCK_USERS } from "@/lib/mockData";

export default function LandlordAgreements() {
  const myOccupiedFlats = MOCK_FLATS.filter((f) => f.ownerId === "U2" && f.tenantId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📄 Rental Agreements</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Generate</button>
      </div>

      {/* AI promo card */}
      <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-[14px] p-4 border border-brand-100 mb-5">
        <div className="text-sm font-extrabold text-brand-600 mb-1.5">🤖 AI Agreement Generator</div>
        <div className="text-xs text-ink-muted leading-relaxed mb-3">
          Generate legally-sound rental agreements for 8 Indian cities in under 2 minutes. Free AI draft · Lawyer review ₹499 · Registration support ₹999.
        </div>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          Generate New Agreement
        </button>
      </div>

      {/* Existing agreements */}
      {myOccupiedFlats.map((flat) => {
        const tenant = MOCK_USERS.find((u) => u.id === flat.tenantId)!;
        return (
          <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-xl">📄</div>
              <div>
                <div className="text-sm font-bold text-ink">{tenant.name} — Flat {flat.flatNo}</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  Lease: Aug 2025 – Aug 2026 · {formatCurrency(flat.rent)}/mo
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View</button>
              <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Download</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
