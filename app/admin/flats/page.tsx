"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSociety, getAdminSocietyId, getSocietyFlats, createFlat, updateFlat, deleteFlat, type AdminSociety, type AdminFlat } from "@/lib/admin-data";
import toast, { Toaster } from "react-hot-toast";

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

type FormData = { flat_number: string; block: string; floor_number: string; flat_type: string; area_sqft: string };

export default function AdminFlats() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({ flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "" });

  async function loadData() {
    if (!user?.email) return;
    try {
      const [soc, sid] = await Promise.all([
        getAdminSociety(user.email),
        getAdminSocietyId(user.email),
      ]);
      setSociety(soc);
      setSocietyId(sid);
      if (sid) {
        const f = await getSocietyFlats(sid);
        setFlats(f);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load");
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  async function handleAddFlat(e: React.FormEvent) {
    e.preventDefault();
    if (!societyId) return;
    setSaving(true);
    try {
      const newFlat = await createFlat(societyId, {
        flat_number: form.flat_number,
        block: form.block || null,
        floor_number: form.floor_number ? Number(form.floor_number) : null,
        flat_type: form.flat_type || null,
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      });
      setFlats(prev => [...prev, newFlat]);
      toast.success("Flat added!");
      setForm({ flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "" });
      setShowForm(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to add flat");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFlat(flatId: string) {
    if (!confirm("Delete this flat?")) return;
    try {
      await deleteFlat(flatId);
      setFlats(prev => prev.filter(f => f.id !== flatId));
      toast.success("Flat deleted.");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to delete flat");
    }
  }

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🏢 All Flats — {society?.name ?? "—"}</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ Add Flat"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddFlat} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink">Add New Flat</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Flat Number *</label>
              <input required className={inputClass} placeholder="e.g. 101" value={form.flat_number} onChange={e => setForm(f => ({ ...f, flat_number: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Block</label>
              <input className={inputClass} placeholder="e.g. A" value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Floor</label>
              <input type="number" className={inputClass} placeholder="e.g. 1" value={form.floor_number} onChange={e => setForm(f => ({ ...f, floor_number: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <input className={inputClass} placeholder="e.g. 2BHK" value={form.flat_type} onChange={e => setForm(f => ({ ...f, flat_type: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Area (sqft)</label>
              <input type="number" className={inputClass} placeholder="e.g. 900" value={form.area_sqft} onChange={e => setForm(f => ({ ...f, area_sqft: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Adding..." : "Add Flat"}
          </button>
        </form>
      )}

      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No flats. Add one above to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {flats.map(flat => {
            const ownerName = (flat.owner as { full_name: string } | null)?.full_name ?? "—";
            const tenantUser = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
            return (
              <div key={flat.id} className={`bg-white rounded-[14px] p-4 border border-border-default border-l-4 ${flat.status === "occupied" ? "border-l-green-500" : "border-l-gray-400"}`}>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-base font-extrabold text-ink">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</span>
                  <div className="flex gap-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${flat.status === "occupied" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {flat.status}
                    </span>
                    <button onClick={() => handleDeleteFlat(flat.id)} className="text-[10px] text-red-400 font-semibold cursor-pointer">Delete</button>
                  </div>
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
                {flat.maintenance_amount && <div className="text-[11px] text-ink-muted mt-1">💰 Maintenance: {formatCurrency(flat.maintenance_amount)}/mo</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
