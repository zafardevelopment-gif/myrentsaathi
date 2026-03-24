"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSocietyId, getParkingSlots, type ParkingSlot } from "@/lib/admin-data";

export default function AdminParking() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const sid = await getAdminSocietyId(user!.email);
      if (sid) {
        const s = await getParkingSlots(sid);
        setSlots(s);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const occupiedCount = slots.filter((p) => p.status === "occupied").length;
  const availableCount = slots.filter((p) => p.status === "available").length;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🅿️ Parking Management</h2>
        <div className="flex gap-1.5">
          <StatusBadge status="overdue" label={`${occupiedCount} Occupied`} />
          <StatusBadge status="active" label={`${availableCount} Available`} />
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No parking slots found. Seed the database first.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {slots.map((pk) => {
            const flat = pk.flat as { flat_number: string; block: string | null } | null;
            return (
              <div key={pk.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 text-center ${pk.status === "occupied" ? "border-l-red-500" : "border-l-green-500"}`}>
                <div className="text-lg font-extrabold text-ink">{pk.slot_number}</div>
                <span className="inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">{pk.slot_type}</span>
                {pk.level && <div className="text-[11px] text-ink-muted mt-1">{pk.level}</div>}
                {pk.vehicle_number ? (
                  <div className="mt-1.5">
                    <div className="text-xs font-bold text-ink">{pk.vehicle_number}</div>
                    {pk.vehicle_model && <div className="text-[11px] text-ink-muted">{pk.vehicle_model}</div>}
                    {flat && <div className="text-[11px] text-ink-muted">Flat {flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</div>}
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-green-600 font-semibold">Available</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
