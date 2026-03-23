"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_PARKING, MOCK_FLATS } from "@/lib/mockData";

export default function AdminParking() {
  const occupiedCount = MOCK_PARKING.filter((p) => p.status === "occupied").length;
  const availableCount = MOCK_PARKING.filter((p) => p.status === "available").length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🅿️ Parking Management</h2>
        <div className="flex gap-1.5">
          <StatusBadge status="overdue" label={`${occupiedCount} Occupied`} />
          <StatusBadge status="active" label={`${availableCount} Available`} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {MOCK_PARKING.map((pk) => {
          const flat = pk.flatId ? MOCK_FLATS.find((f) => f.id === pk.flatId) : null;
          return (
            <div key={pk.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 text-center ${pk.status === "occupied" ? "border-l-red-500" : "border-l-green-500"}`}>
              <div className="text-lg font-extrabold text-ink">{pk.slot}</div>
              <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{pk.type}</span>
              <div className="text-[11px] text-ink-muted mt-1">{pk.level}</div>
              {pk.vehicle ? (
                <div className="mt-1.5">
                  <div className="text-xs font-bold text-ink">{pk.vehicle}</div>
                  <div className="text-[11px] text-ink-muted">{pk.model} • {flat?.flatNo}</div>
                </div>
              ) : (
                <div className="mt-1.5 text-xs text-green-600 font-semibold">Available</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
