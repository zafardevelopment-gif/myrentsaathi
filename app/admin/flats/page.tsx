"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSociety, getAdminSocietyId, getSocietyFlats, type AdminSociety, type AdminFlat } from "@/lib/admin-data";

export default function AdminFlats() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      try {
        const [soc, societyId] = await Promise.all([
          getAdminSociety(user!.email),
          getAdminSocietyId(user!.email),
        ]);
        setSociety(soc);
        if (societyId) {
          const f = await getSocietyFlats(societyId);
          setFlats(f);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-warm-100 rounded-[14px] animate-pulse" />)}
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
        <h2 className="text-[15px] font-extrabold text-ink">🏢 All Flats — {society?.name ?? "—"}</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Add Flat</button>
      </div>

      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No flats found. Seed the database first.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {flats.map((flat) => {
            const ownerName = (flat.owner as { full_name: string } | null)?.full_name ?? "—";
            const tenantUser = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
            return (
              <div key={flat.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${flat.status === "occupied" ? "border-l-green-500" : "border-l-gray-400"}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-base font-extrabold text-ink">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</span>
                  <StatusBadge status={flat.status} />
                </div>
                <div className="text-xs text-ink-muted">
                  {flat.flat_type ?? "—"}{flat.area_sqft ? ` • ${flat.area_sqft} sqft` : ""}
                  {flat.floor_number != null ? ` • Floor ${flat.floor_number}` : ""}
                </div>
                <div className="text-xs text-ink mt-1">👤 Owner: <b>{ownerName}</b></div>
                {tenantUser && (
                  <div className="text-xs text-green-700 mt-0.5">
                    🏡 Tenant: <b>{tenantUser.full_name}</b>
                    {flat.monthly_rent ? ` • ${formatCurrency(flat.monthly_rent)}/mo` : ""}
                  </div>
                )}
                <div className="text-[11px] text-ink-muted mt-1">
                  {flat.maintenance_amount ? `Maintenance: ${formatCurrency(flat.maintenance_amount)}/mo` : ""}
                  {flat.security_deposit ? ` • Deposit: ${formatCurrency(flat.security_deposit)}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
