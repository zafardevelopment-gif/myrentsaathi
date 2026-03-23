"use client";

import { formatCurrency } from "@/lib/utils";
import { MOCK_FLATS, MOCK_USERS, MOCK_SOCIETIES } from "@/lib/mockData";

export default function LandlordTenants() {
  const myOccupiedFlats = MOCK_FLATS.filter((f) => f.ownerId === "U2" && f.tenantId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">👥 Tenants</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Tenant</button>
      </div>

      {myOccupiedFlats.map((flat) => {
        const tenant = MOCK_USERS.find((u) => u.id === flat.tenantId)!;
        const society = MOCK_SOCIETIES.find((s) => s.id === flat.societyId);
        return (
          <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-3">
            {/* Tenant header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">
                {tenant.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-ink">{tenant.name}</div>
                <div className="text-[11px] text-ink-muted">{flat.flatNo} · {society?.name}</div>
                <div className="text-[11px] text-ink-muted">{tenant.phone} · {tenant.email}</div>
              </div>
            </div>

            {/* Key details */}
            <div className="flex gap-3 bg-warm-50 rounded-xl p-3 mb-3 flex-wrap">
              {[
                { label: "Monthly Rent", value: formatCurrency(flat.rent) },
                { label: "Deposit Held", value: formatCurrency(flat.deposit) },
                { label: "Lease End", value: "15 Aug 2026" },
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
      })}

      {myOccupiedFlats.length === 0 && (
        <div className="text-center py-10 text-ink-muted text-sm">No tenants yet. Add a property first.</div>
      )}
    </div>
  );
}
