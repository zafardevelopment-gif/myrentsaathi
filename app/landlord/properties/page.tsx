"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getLandlordFlats, getLandlordUserId, addLandlordFlat, updateLandlordFlat,
  deleteLandlordFlat, getAllSocieties,
  type LandlordFlat, type SocietyOption,
} from "@/lib/landlord-data";
import toast, { Toaster } from "react-hot-toast";

const FLAT_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "Studio", "Penthouse", "Commercial"];
const emptyForm = { flat_number: "", block: "", flat_type: "", floor_number: "", area_sqft: "", monthly_rent: "", security_deposit: "", society_id: "" };

export default function LandlordProperties() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);

  // Edit modal
  const [editFlat, setEditFlat] = useState<LandlordFlat | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // Detail modal
  const [detailFlat, setDetailFlat] = useState<LandlordFlat | null>(null);

  // Delete confirm
  const [deleteFlat, setDeleteFlat] = useState<LandlordFlat | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    if (!user?.email) return;
    const [f, lid, socs] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
      getAllSocieties().catch(() => [] as SocietyOption[]),
    ]);
    setFlats(f);
    setLandlordId(lid);
    setSocieties(socs);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, [user]);

  async function handleAddFlat(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId) return;
    setSaving(true);
    const result = await addLandlordFlat({
      owner_id: landlordId,
      society_id: addForm.society_id || undefined,
      flat_number: addForm.flat_number,
      block: addForm.block || undefined,
      flat_type: addForm.flat_type || undefined,
      floor_number: addForm.floor_number ? Number(addForm.floor_number) : undefined,
      area_sqft: addForm.area_sqft ? Number(addForm.area_sqft) : undefined,
      monthly_rent: addForm.monthly_rent ? Number(addForm.monthly_rent) : undefined,
      security_deposit: addForm.security_deposit ? Number(addForm.security_deposit) : undefined,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error ?? "Failed to add property."); return; }
    toast.success("Property added!");
    setAddForm(emptyForm);
    setShowAddForm(false);
    setLoading(true);
    await loadData();
  }

  async function handleEditFlat(e: React.FormEvent) {
    e.preventDefault();
    if (!editFlat) return;
    setSaving(true);
    const result = await updateLandlordFlat(editFlat.id, {
      flat_number: editForm.flat_number,
      block: editForm.block || null,
      flat_type: editForm.flat_type || null,
      floor_number: editForm.floor_number ? Number(editForm.floor_number) : null,
      area_sqft: editForm.area_sqft ? Number(editForm.area_sqft) : null,
      monthly_rent: editForm.monthly_rent ? Number(editForm.monthly_rent) : null,
      security_deposit: editForm.security_deposit ? Number(editForm.security_deposit) : null,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error ?? "Failed to update."); return; }
    toast.success("Property updated!");
    setEditFlat(null);
    setLoading(true);
    await loadData();
  }

  async function handleDelete() {
    if (!deleteFlat) return;
    setDeleting(true);
    const result = await deleteLandlordFlat(deleteFlat.id);
    setDeleting(false);
    if (!result.success) { toast.error(result.error ?? "Failed to delete."); return; }
    toast.success("Property deleted.");
    setDeleteFlat(null);
    setLoading(true);
    await loadData();
  }

  if (loading) {
    return <div className="grid grid-cols-1 gap-3">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  return (
    <div>
      <Toaster position="top-center" />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🏠 My Properties</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showAddForm ? "Cancel" : "+ Add Property"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddFlat} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Add New Property</div>
          <div>
            <label className={labelClass}>Society (optional)</label>
            <select className={inputClass} value={addForm.society_id} onChange={e => setAddForm(f => ({ ...f, society_id: e.target.value }))}>
              <option value="">— None / Independent Property —</option>
              {societies.map(s => <option key={s.id} value={s.id}>{s.name} · {s.city}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Flat Number *</label><input required className={inputClass} placeholder="101" value={addForm.flat_number} onChange={e => setAddForm(f => ({ ...f, flat_number: e.target.value }))} /></div>
            <div><label className={labelClass}>Block / Wing</label><input className={inputClass} placeholder="A" value={addForm.block} onChange={e => setAddForm(f => ({ ...f, block: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Type</label>
              <select className={inputClass} value={addForm.flat_type} onChange={e => setAddForm(f => ({ ...f, flat_type: e.target.value }))}>
                <option value="">— Select —</option>
                {FLAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Floor</label><input type="number" className={inputClass} placeholder="1" value={addForm.floor_number} onChange={e => setAddForm(f => ({ ...f, floor_number: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Area (sq.ft)</label><input type="number" className={inputClass} placeholder="850" value={addForm.area_sqft} onChange={e => setAddForm(f => ({ ...f, area_sqft: e.target.value }))} /></div>
            <div><label className={labelClass}>Monthly Rent (₹)</label><input type="number" className={inputClass} placeholder="25000" value={addForm.monthly_rent} onChange={e => setAddForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
          </div>
          <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} placeholder="50000" value={addForm.security_deposit} onChange={e => setAddForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{saving ? "Adding..." : "Add Property"}</button>
        </form>
      )}

      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No properties yet. Add your first property above.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {flats.map((flat) => {
            const society = flat.society as { name: string; city: string } | null;
            const tenantUser = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
            return (
              <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-lg font-extrabold text-ink">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}</div>
                    {society && <div className="text-xs text-ink-muted mt-0.5">{society.name} · {society.city}</div>}
                    <div className="text-[11px] text-ink-muted">
                      {flat.flat_type ?? "—"}{flat.area_sqft ? ` · ${flat.area_sqft} sq.ft` : ""}{flat.floor_number != null ? ` · Floor ${flat.floor_number}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={flat.status} />
                    <button onClick={() => { setEditFlat(flat); setEditForm({ flat_number: flat.flat_number, block: flat.block ?? "", flat_type: flat.flat_type ?? "", floor_number: flat.floor_number != null ? String(flat.floor_number) : "", area_sqft: flat.area_sqft != null ? String(flat.area_sqft) : "", monthly_rent: flat.monthly_rent != null ? String(flat.monthly_rent) : "", security_deposit: flat.security_deposit != null ? String(flat.security_deposit) : "", society_id: "" }); }}
                      className="p-1.5 rounded-lg border border-border-default text-ink-muted text-[11px] cursor-pointer hover:bg-warm-50">✏️</button>
                    <button onClick={() => setDeleteFlat(flat)} className="p-1.5 rounded-lg border border-red-200 text-red-500 text-[11px] cursor-pointer hover:bg-red-50">🗑️</button>
                  </div>
                </div>

                {tenantUser ? (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-extrabold text-green-700">{tenantUser.full_name.split(" ").map(n => n[0]).join("")}</div>
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
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setDetailFlat(flat)} className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View Details</button>
                  {tenantUser && (
                    <a href={`https://wa.me/${(tenantUser.phone ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">📱 Contact</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setDetailFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="text-base font-extrabold text-ink">🏠 Property Details</div>
              <button onClick={() => setDetailFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Flat No.", value: `${detailFlat.flat_number}${detailFlat.block ? ` (${detailFlat.block})` : ""}` },
                { label: "Type", value: detailFlat.flat_type ?? "—" },
                { label: "Floor", value: detailFlat.floor_number != null ? `Floor ${detailFlat.floor_number}` : "—" },
                { label: "Area", value: detailFlat.area_sqft ? `${detailFlat.area_sqft} sq.ft` : "—" },
                { label: "Monthly Rent", value: formatCurrency(detailFlat.monthly_rent ?? 0) },
                { label: "Security Deposit", value: formatCurrency(detailFlat.security_deposit ?? 0) },
                { label: "Status", value: detailFlat.status },
                { label: "Society", value: (detailFlat.society as { name: string } | null)?.name ?? "Independent" },
              ].map(d => (
                <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                  <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                  <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setDetailFlat(null)} className="w-full py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-base font-extrabold text-ink">✏️ Edit Property</div>
              <button onClick={() => setEditFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleEditFlat} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>Flat Number *</label><input required className={inputClass} value={editForm.flat_number} onChange={e => setEditForm(f => ({ ...f, flat_number: e.target.value }))} /></div>
                <div><label className={labelClass}>Block / Wing</label><input className={inputClass} value={editForm.block} onChange={e => setEditForm(f => ({ ...f, block: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>Type</label>
                  <select className={inputClass} value={editForm.flat_type} onChange={e => setEditForm(f => ({ ...f, flat_type: e.target.value }))}>
                    <option value="">— Select —</option>
                    {FLAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Floor</label><input type="number" className={inputClass} value={editForm.floor_number} onChange={e => setEditForm(f => ({ ...f, floor_number: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>Area (sq.ft)</label><input type="number" className={inputClass} value={editForm.area_sqft} onChange={e => setEditForm(f => ({ ...f, area_sqft: e.target.value }))} /></div>
                <div><label className={labelClass}>Monthly Rent (₹)</label><input type="number" className={inputClass} value={editForm.monthly_rent} onChange={e => setEditForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              </div>
              <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} value={editForm.security_deposit} onChange={e => setEditForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-sm p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">🗑️</div>
            <div className="text-base font-extrabold text-ink mb-1">Delete Property?</div>
            <div className="text-sm text-ink-muted mb-4">Flat <strong>{deleteFlat.flat_number}{deleteFlat.block ? ` (${deleteFlat.block})` : ""}</strong> will be permanently deleted.</div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteFlat(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
