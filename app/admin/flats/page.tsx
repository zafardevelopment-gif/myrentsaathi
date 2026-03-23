"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { MOCK_SOCIETIES, MOCK_FLATS, MOCK_USERS } from "@/lib/mockData";

export default function AdminFlats() {
  const society = MOCK_SOCIETIES[0];
  const flats = MOCK_FLATS.filter((f) => f.societyId === "S1");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🏢 All Flats — {society.name}</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Flat</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {flats.map((flat) => {
          const owner = MOCK_USERS.find((u) => u.id === flat.ownerId);
          const tenant = flat.tenantId ? MOCK_USERS.find((u) => u.id === flat.tenantId) : null;
          return (
            <div key={flat.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${flat.status === "occupied" ? "border-l-green-500" : "border-l-gray-400"}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-base font-extrabold text-ink">{flat.flatNo}</span>
                <StatusBadge status={flat.status} />
              </div>
              <div className="text-xs text-ink-muted">{flat.type} • {flat.area} sqft • Floor {flat.floor} • Block {flat.block}</div>
              <div className="text-xs text-ink mt-1">👤 Owner: <b>{owner?.name}</b></div>
              {tenant && (
                <div className="text-xs text-green-700 mt-0.5">🏡 Tenant: <b>{tenant.name}</b> • {formatCurrency(flat.rent)}/mo</div>
              )}
              <div className="text-[11px] text-ink-muted mt-1">Maintenance: {formatCurrency(flat.maintAmount)}/mo • Deposit: {formatCurrency(flat.deposit)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
