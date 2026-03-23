"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_FLATS, MOCK_USERS, MOCK_SOCIETIES } from "@/lib/mockData";

export default function LandlordProperties() {
  const myFlats = MOCK_FLATS.filter((f) => f.ownerId === "U2");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🏠 My Properties</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Property</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {myFlats.map((flat) => {
          const society = MOCK_SOCIETIES.find((s) => s.id === flat.societyId);
          const tenant = flat.tenantId ? MOCK_USERS.find((u) => u.id === flat.tenantId) : null;
          return (
            <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-lg font-extrabold text-ink">{flat.flatNo}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{society?.name} · {society?.city}</div>
                  <div className="text-[11px] text-ink-muted">{flat.type} · {flat.area} sq.ft · Floor {flat.floor}</div>
                </div>
                <StatusBadge status={flat.status} />
              </div>

              {tenant ? (
                <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-extrabold text-green-700">
                        {tenant.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-green-700">{tenant.name}</div>
                        <div className="text-[11px] text-ink-muted">{tenant.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-ink">{formatCurrency(flat.rent)}</div>
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
                {tenant && (
                  <button className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">📱 Contact</button>
                )}
                <button className="px-3 py-1.5 rounded-lg border border-brand-500 text-brand-500 text-[11px] font-semibold cursor-pointer">Agreement</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
