"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordAgreements, type LandlordAgreement } from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
};

export default function LandlordAgreements() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    getLandlordAgreements(user.email)
      .then(setAgreements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

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

      {agreements.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No agreements found.</div>
      ) : (
        agreements.map((ag) => {
          const flat = ag.flat as { flat_number: string; block: string | null } | null;
          const tenantUser = (ag.tenant as { user?: { full_name: string } | null } | null)?.user;
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
          const society = ag.society as { name: string; city: string } | null;
          return (
            <div key={ag.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-xl">📄</div>
                <div>
                  <div className="text-sm font-bold text-ink">
                    {tenantUser?.full_name ?? "—"} — {flatLabel}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {ag.start_date ? new Date(ag.start_date).toLocaleDateString("en-IN") : "?"} –{" "}
                    {ag.end_date ? new Date(ag.end_date).toLocaleDateString("en-IN") : "?"} · {formatCurrency(ag.monthly_rent)}/mo
                  </div>
                  {society && <div className="text-[10px] text-ink-muted">{society.name}, {society.city}</div>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold ${STATUS_BADGE[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {ag.status}
                </span>
                <div className="flex gap-1.5">
                  <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View</button>
                  <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Download</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
