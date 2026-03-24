"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordAgreements, type LandlordFlat, type LandlordAgreement } from "@/lib/landlord-data";

export default function LandlordTenants() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      getLandlordFlats(user.email),
      getLandlordAgreements(user.email),
    ])
      .then(([f, a]) => { setFlats(f); setAgreements(a); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  const occupiedFlats = flats.filter((f) => f.current_tenant_id);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">👥 Tenants</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Tenant</button>
      </div>

      {occupiedFlats.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No tenants yet. Add a property first.</div>
      ) : (
        occupiedFlats.map((flat) => {
          const tenantUser = (flat.tenant as { id: string; user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
          const society = flat.society as { name: string; city: string } | null;
          // Find active agreement for this flat
          const agreement = agreements.find((a) => {
            const aFlat = a.flat as { flat_number: string; block: string | null } | null;
            return aFlat?.flat_number === flat.flat_number && a.status === "active";
          });

          if (!tenantUser) return null;

          return (
            <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-3">
              {/* Tenant header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">
                  {tenantUser.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">{tenantUser.full_name}</div>
                  <div className="text-[11px] text-ink-muted">
                    {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
                    {society ? ` · ${society.name}` : ""}
                  </div>
                  <div className="text-[11px] text-ink-muted">{tenantUser.phone} · {tenantUser.email}</div>
                </div>
              </div>

              {/* Key details */}
              <div className="flex gap-3 bg-warm-50 rounded-xl p-3 mb-3 flex-wrap">
                {[
                  { label: "Monthly Rent", value: formatCurrency(flat.monthly_rent ?? 0) },
                  { label: "Deposit Held", value: formatCurrency(flat.security_deposit ?? 0) },
                  { label: "Lease End", value: agreement ? new Date(agreement.end_date).toLocaleDateString("en-IN") : "—" },
                ].map((d) => (
                  <div key={d.label} className="flex-1 min-w-[80px]">
                    <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                    <div className="text-sm font-extrabold text-brand-500 mt-0.5">{d.value}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View KYC</button>
                <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Agreement</button>
                <button className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">📱 WhatsApp</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
