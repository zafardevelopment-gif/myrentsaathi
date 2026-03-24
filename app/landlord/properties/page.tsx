"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, type LandlordFlat } from "@/lib/landlord-data";

export default function LandlordProperties() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    getLandlordFlats(user.email)
      .then(setFlats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3">
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
        <h2 className="text-[15px] font-extrabold text-ink">🏠 My Properties</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Property</button>
      </div>

      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No properties found. Seed the database first.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {flats.map((flat) => {
            const society = flat.society as { name: string; city: string } | null;
            const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
            return (
              <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-lg font-extrabold text-ink">
                      {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}
                    </div>
                    {society && (
                      <div className="text-xs text-ink-muted mt-0.5">{society.name} · {society.city}</div>
                    )}
                    <div className="text-[11px] text-ink-muted">
                      {flat.flat_type ?? "—"}
                      {flat.area_sqft ? ` · ${flat.area_sqft} sq.ft` : ""}
                      {flat.floor_number != null ? ` · Floor ${flat.floor_number}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={flat.status} />
                </div>

                {tenantUser ? (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-extrabold text-green-700">
                          {tenantUser.full_name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-green-700">{tenantUser.full_name}</div>
                          <div className="text-[11px] text-ink-muted">{tenantUser.phone}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-ink">{formatCurrency(flat.monthly_rent ?? 0)}</div>
                        <div className="text-[10px] text-ink-muted">per month</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-warm-50 border border-dashed border-border-default p-3 mb-3 text-center">
                    <div className="text-xs text-ink-muted">No tenant — property vacant</div>
                    <button className="mt-2 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[11px] font-bold cursor-pointer">+ Add Tenant</button>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View Details</button>
                  {tenantUser && (
                    <button className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">📱 Contact</button>
                  )}
                  <button className="px-3 py-1.5 rounded-lg border border-brand-500 text-brand-500 text-[11px] font-semibold cursor-pointer">Agreement</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
