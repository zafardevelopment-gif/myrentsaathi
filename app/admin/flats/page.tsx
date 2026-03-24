"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSociety, getAdminSocietyId, getSocietyFlats, createFlat, updateFlat, deleteFlat, type AdminSociety, type AdminFlat } from "@/lib/admin-data";
import toast, { Toaster } from "react-hot-toast";

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

type FormData = {
  flat_number: string; block: string; floor_number: string; flat_type: string; area_sqft: string;
  owner_name: string; owner_phone: string; owner_email: string;
  tenant_name: string; tenant_phone: string; tenant_email: string;
};

export default function AdminFlats() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [flats, setFlats] = useState<AdminFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedFlat, setExpandedFlat] = useState<string | null>(null);
  const [editingFlat, setEditingFlat] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AdminFlat>>({});
  const [form, setForm] = useState<FormData>({
    flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "",
    owner_name: "", owner_phone: "", owner_email: "",
    tenant_name: "", tenant_phone: "", tenant_email: ""
  });

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
        owner_name: form.owner_name || null,
        owner_phone: form.owner_phone || null,
        owner_email: form.owner_email || null,
        tenant_name: form.tenant_name || null,
        tenant_phone: form.tenant_phone || null,
        tenant_email: form.tenant_email || null,
      });
      setFlats(prev => [...prev, newFlat]);
      toast.success("Flat added!");
      setForm({ flat_number: "", block: "", floor_number: "", flat_type: "", area_sqft: "", owner_name: "", owner_phone: "", owner_email: "", tenant_name: "", tenant_phone: "", tenant_email: "" });
      setShowForm(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to add flat");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFlatDetails(flatId: string) {
    try {
      const updated = await updateFlat(flatId, editFormData);
      setFlats(prev => prev.map(f => f.id === flatId ? updated : f));
      setEditingFlat(null);
      setEditFormData({});
      toast.success("Flat updated!");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to save flat");
    }
  }

  function downloadSampleCSV() {
    const headers = ["flat_number", "block", "floor_number", "flat_type", "area_sqft", "owner_name", "owner_phone", "owner_email", "tenant_name", "tenant_phone", "tenant_email"];
    const sampleRow = ["101", "A", "1", "2BHK", "900", "Rajesh Kumar", "+91-98765-11111", "rajesh@example.com", "Amit Singh", "+91-98765-22222", "amit@example.com"];
    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flats_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function parseCSV(text: string) {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const cells = line.split(",").map(c => c.trim());
      const row: any = {};
      headers.forEach((h, i) => { row[h] = cells[i] || ""; });
      return row;
    });
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = parseCSV(text);
    if (data.length === 0) {
      toast.error("Invalid CSV format");
      return;
    }
    setPreviewData(data);
    setShowPreview(true);
  }

  async function confirmBulkImport() {
    if (!societyId) return;
    setUploadingBulk(true);
    try {
      for (const row of previewData) {
        await createFlat(societyId, {
          flat_number: row.flat_number,
          block: row.block || null,
          floor_number: row.floor_number ? Number(row.floor_number) : null,
          flat_type: row.flat_type || null,
          area_sqft: row.area_sqft ? Number(row.area_sqft) : null,
          owner_name: row.owner_name || null,
          owner_phone: row.owner_phone || null,
          owner_email: row.owner_email || null,
          tenant_name: row.tenant_name || null,
          tenant_phone: row.tenant_phone || null,
          tenant_email: row.tenant_email || null,
        });
      }
      const f = await getSocietyFlats(societyId);
      setFlats(f);
      setShowPreview(false);
      setPreviewData([]);
      toast.success(`${previewData.length} flats imported!`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to import flats");
    } finally {
      setUploadingBulk(false);
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
        <div className="flex gap-2">
          <button onClick={downloadSampleCSV} className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer">
            📥 Sample CSV
          </button>
          <label className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold cursor-pointer">
            📤 Bulk Upload
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            {showForm ? "Cancel" : "+ Add Flat"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="bg-white rounded-[14px] p-4 border border-yellow-300 mb-4">
          <div className="text-sm font-bold text-ink mb-3">📋 Import Preview ({previewData.length} flats)</div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto mb-3">
            <table className="w-full text-xs">
              <thead className="bg-warm-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Flat #</th>
                  <th className="px-2 py-1 text-left">Block</th>
                  <th className="px-2 py-1 text-left">Owner</th>
                  <th className="px-2 py-1 text-left">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="border-b border-border-light hover:bg-warm-50">
                    <td className="px-2 py-1">{row.flat_number}</td>
                    <td className="px-2 py-1">{row.block || "—"}</td>
                    <td className="px-2 py-1 text-ink-muted">{row.owner_name || "—"}</td>
                    <td className="px-2 py-1 text-ink-muted">{row.tenant_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmBulkImport}
              disabled={uploadingBulk}
              className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {uploadingBulk ? "Importing..." : "✓ Confirm Import"}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 py-2 rounded-xl bg-gray-300 text-ink text-xs font-bold cursor-pointer"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddFlat} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3 max-h-[70vh] overflow-y-auto">
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

          <div className="border-t border-border-light pt-3 mt-3">
            <div className="text-xs font-bold text-ink-muted mb-2">Owner Details (optional)</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} placeholder="Owner name" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} placeholder="Phone" value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} placeholder="Email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="border-t border-border-light pt-3 mt-3">
            <div className="text-xs font-bold text-ink-muted mb-2">Tenant Details (optional)</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} placeholder="Tenant name" value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} placeholder="Phone" value={form.tenant_phone} onChange={e => setForm(f => ({ ...f, tenant_phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} placeholder="Email" value={form.tenant_email} onChange={e => setForm(f => ({ ...f, tenant_email: e.target.value }))} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60 mt-2">
            {saving ? "Adding..." : "Add Flat"}
          </button>
        </form>
      )}

      {flats.length === 0 ? (
        <div className="text-center py-12 text-ink-muted text-sm">No flats. Add one above to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {flats.map(flat => {
            const isExpanded = expandedFlat === flat.id;
            const isEditing = editingFlat === flat.id;
            const linkedOwner = (flat.owner as { full_name: string; phone: string; email: string } | null);
            const linkedTenant = (flat.tenant as { user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
            const ownerDisplay = linkedOwner?.full_name || flat.owner_name || "Not set";
            const tenantDisplay = linkedTenant?.full_name || flat.tenant_name || "Not set";

            return (
              <div key={flat.id} className={`bg-white rounded-[14px] border border-border-default border-l-4 ${flat.status === "occupied" ? "border-l-green-500" : "border-l-gray-400"} overflow-hidden`}>
                <div className="p-4">
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
                  <div className="text-xs text-ink mt-2">👤 Owner: <b>{ownerDisplay}</b></div>
                  <div className="text-xs text-ink">🏡 Tenant: <b>{tenantDisplay}</b></div>
                  {flat.maintenance_amount && <div className="text-[11px] text-ink-muted mt-1">💰 Maintenance: {formatCurrency(flat.maintenance_amount)}/mo</div>}
                  <button
                    onClick={() => setExpandedFlat(isExpanded ? null : flat.id)}
                    className="text-[10px] text-brand-500 font-semibold cursor-pointer mt-2"
                  >
                    {isExpanded ? "▼ Hide Details" : "▶ Show Details"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-warm-50 border-t border-border-light p-4 space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <div className="text-xs font-bold text-ink-muted mb-2">Owner Details {linkedOwner && "(Linked User)"}</div>
                          <div className="space-y-2">
                            <input
                              className={inputClass}
                              placeholder="Name"
                              value={(editFormData.owner_name ?? flat.owner_name) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                              disabled={!!linkedOwner}
                            />
                            <input
                              className={inputClass}
                              placeholder="Phone"
                              value={(editFormData.owner_phone ?? flat.owner_phone) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, owner_phone: e.target.value }))}
                              disabled={!!linkedOwner}
                            />
                            <input
                              className={inputClass}
                              placeholder="Email"
                              value={(editFormData.owner_email ?? flat.owner_email) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                              disabled={!!linkedOwner}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink-muted mb-2">Tenant Details {linkedTenant && "(Linked User)"}</div>
                          <div className="space-y-2">
                            <input
                              className={inputClass}
                              placeholder="Name"
                              value={(editFormData.tenant_name ?? flat.tenant_name) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, tenant_name: e.target.value }))}
                              disabled={!!linkedTenant}
                            />
                            <input
                              className={inputClass}
                              placeholder="Phone"
                              value={(editFormData.tenant_phone ?? flat.tenant_phone) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, tenant_phone: e.target.value }))}
                              disabled={!!linkedTenant}
                            />
                            <input
                              className={inputClass}
                              placeholder="Email"
                              value={(editFormData.tenant_email ?? flat.tenant_email) || ""}
                              onChange={e => setEditFormData(prev => ({ ...prev, tenant_email: e.target.value }))}
                              disabled={!!linkedTenant}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveFlatDetails(flat.id)}
                            className="flex-1 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingFlat(null);
                              setEditFormData({});
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-gray-300 text-ink text-[10px] font-bold cursor-pointer"
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-xs font-bold text-ink-muted mb-1">Owner</div>
                          {linkedOwner ? (
                            <div className="text-xs text-ink">
                              <b>{linkedOwner.full_name}</b>
                              <div className="text-[10px] text-ink-muted">{linkedOwner.phone} · {linkedOwner.email}</div>
                              <span className="text-[9px] text-green-600 font-semibold">✓ Linked User</span>
                            </div>
                          ) : flat.owner_name ? (
                            <div className="text-xs text-ink">
                              <b>{flat.owner_name}</b>
                              <div className="text-[10px] text-ink-muted">{flat.owner_phone} · {flat.owner_email}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-ink-muted">Not set</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink-muted mb-1">Tenant</div>
                          {linkedTenant ? (
                            <div className="text-xs text-ink">
                              <b>{linkedTenant.full_name}</b>
                              <div className="text-[10px] text-ink-muted">{linkedTenant.phone} · {linkedTenant.email}</div>
                              <span className="text-[9px] text-green-600 font-semibold">✓ Linked User</span>
                            </div>
                          ) : flat.tenant_name ? (
                            <div className="text-xs text-ink">
                              <b>{flat.tenant_name}</b>
                              <div className="text-[10px] text-ink-muted">{flat.tenant_phone} · {flat.tenant_email}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-ink-muted">Not set</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingFlat(flat.id);
                            setEditFormData({
                              owner_name: flat.owner_name || "",
                              owner_phone: flat.owner_phone || "",
                              owner_email: flat.owner_email || "",
                              tenant_name: flat.tenant_name || "",
                              tenant_phone: flat.tenant_phone || "",
                              tenant_email: flat.tenant_email || "",
                            });
                          }}
                          className="w-full py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          ✏️ Edit Details
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
