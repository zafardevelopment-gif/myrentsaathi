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
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import ReceiptModal from "@/components/tenant/ReceiptModal";

const FLAT_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "Studio", "Penthouse", "Commercial"];

function TenantProfileTab({ tenantFlat }: { tenantFlat: LandlordFlat }) {
  const tu = (tenantFlat.tenant as { id: string; user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-warm-50 rounded-xl p-3">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-lg font-extrabold text-brand-600">{(tu?.full_name ?? "T").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
        <div>
          <div className="text-sm font-extrabold text-ink">{tu?.full_name ?? "—"}</div>
          <div className="text-xs text-ink-muted">{tu?.phone ?? "—"}</div>
          <div className="text-xs text-ink-muted">{tu?.email ?? "—"}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Monthly Rent", value: formatCurrency(tenantFlat.monthly_rent ?? 0) },
          { label: "Security Deposit", value: formatCurrency(tenantFlat.security_deposit ?? 0) },
          { label: "Flat Type", value: tenantFlat.flat_type ?? "—" },
          { label: "Status", value: tenantFlat.status },
        ].map(d => (
          <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
            <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
            <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const emptyForm = { flat_number: "", block: "", flat_type: "", floor_number: "", area_sqft: "", monthly_rent: "", security_deposit: "", society_id: "", society_name_custom: "" };

type TenantModalTab = "profile" | "payments" | "agreement" | "documents" | "complaints";

type RentPayment = { id: string; amount: number; month_year: string; status: string; payment_date: string | null; payment_method: string | null };
type Agreement = { id: string; tier: string; status: string; monthly_rent: number; security_deposit: number | null; start_date: string; end_date: string };
type Document = { id: string; title?: string; file_name: string; file_url: string; file_size?: number | null; category?: string; created_at: string };
type Complaint = { id: string; subject: string; category: string; priority: string; status: string; created_at: string };

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

  // Tenant modal
  const [tenantFlat, setTenantFlat] = useState<LandlordFlat | null>(null);
  const [tenantTab, setTenantTab] = useState<TenantModalTab>("profile");
  const [tenantPayments, setTenantPayments] = useState<RentPayment[]>([]);
  const [receiptPayment, setReceiptPayment] = useState<RentPayment | null>(null);
  const [tenantAgreement, setTenantAgreement] = useState<Agreement | null>(null);
  const [tenantDocuments, setTenantDocuments] = useState<Document[]>([]);
  const [tenantComplaints, setTenantComplaints] = useState<Complaint[]>([]);
  const [tenantLoading, setTenantLoading] = useState(false);

  // Delete confirm
  const [deleteFlat, setDeleteFlat] = useState<LandlordFlat | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick rent change
  const [rentFlat, setRentFlat] = useState<LandlordFlat | null>(null);
  const [rentValue, setRentValue] = useState("");
  const [rentSaving, setRentSaving] = useState(false);

  // Search / Filter
  const [filterName, setFilterName] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  async function openTenantModal(flat: LandlordFlat) {
    setTenantFlat(flat);
    setTenantTab("profile");
    setTenantLoading(true);
    const tenantUserId = flat.current_tenant_id;
    if (!tenantUserId) { setTenantLoading(false); return; }

    // Find tenant record id
    const { data: tenantRow } = await supabase.from("tenants").select("id").eq("user_id", tenantUserId).eq("flat_id", flat.id).single();
    const tenantId = tenantRow?.id;

    const [payments, docs, complaints] = await Promise.all([
      tenantId
        ? supabase.from("rent_payments").select("id, amount, month_year, status, payment_date, payment_method").eq("tenant_id", tenantId).order("month_year", { ascending: false }).limit(12)
        : Promise.resolve({ data: [] }),
      tenantUserId
        ? supabase.from("documents").select("id, title, file_name, file_url, file_size, created_at").eq("uploaded_by", tenantUserId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("tickets").select("id, subject, category, priority, status, created_at").eq("flat_id", flat.id).order("created_at", { ascending: false }),
    ]);

    // Fetch agreement separately to avoid .single().catch() chaining issue
    let agreementData: Agreement | null = null;
    try {
      const { data: ag } = await supabase.from("agreements").select("id, tier, status, monthly_rent, security_deposit, start_date, end_date").eq("flat_id", flat.id).order("created_at", { ascending: false }).limit(1).single();
      agreementData = ag as Agreement | null;
    } catch {
      agreementData = null;
    }

    setTenantPayments((payments.data ?? []) as RentPayment[]);
    setTenantAgreement(agreementData);
    setTenantDocuments((docs.data ?? []) as Document[]);
    setTenantComplaints((complaints.data ?? []) as Complaint[]);
    setTenantLoading(false);
  }

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

  async function handleRentSave() {
    if (!rentFlat || !rentValue.trim()) return;
    const newRent = Number(rentValue);
    if (isNaN(newRent) || newRent <= 0) { toast.error("Enter a valid rent amount."); return; }
    setRentSaving(true);
    const { error } = await supabase.from("flats").update({ monthly_rent: newRent }).eq("id", rentFlat.id);
    setRentSaving(false);
    if (error) { toast.error("Failed to update rent."); return; }
    toast.success("Rent updated!");
    setFlats(prev => prev.map(f => f.id === rentFlat.id ? { ...f, monthly_rent: newRent } : f));
    setRentFlat(null);
    setRentValue("");
  }

  if (loading) {
    return <div className="grid grid-cols-1 gap-3">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  // Filter
  const filteredFlats = flats.filter(flat => {
    const society = flat.society as { name: string; city: string } | null;
    const tenantUser = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
    if (filterName && !tenantUser?.full_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterFlat && !`${flat.flat_number} ${flat.block ?? ""}`.toLowerCase().includes(filterFlat.toLowerCase())) return false;
    if (filterSociety && !`${society?.name ?? ""} ${society?.city ?? ""}`.toLowerCase().includes(filterSociety.toLowerCase())) return false;
    if (filterStatus && flat.status !== filterStatus) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFlats.length / pageSize));
  const pagedFlats = filteredFlats.slice((page - 1) * pageSize, page * pageSize);

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
            {!addForm.society_id && (
              <input
                className={`${inputClass} mt-1`}
                placeholder="Or type society / area name (optional)"
                value={addForm.society_name_custom}
                onChange={e => setAddForm(f => ({ ...f, society_name_custom: e.target.value }))}
              />
            )}
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
        <>
          {/* Page size + count */}
          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap mb-3">
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 flex-1 min-w-[130px]"
              placeholder="🔍 Tenant name..."
              value={filterName}
              onChange={e => { setFilterName(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-28"
              placeholder="Flat no."
              value={filterFlat}
              onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-36"
              placeholder="Society / area..."
              value={filterSociety}
              onChange={e => { setFilterSociety(e.target.value); setPage(1); }}
            />
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
            {(filterName || filterFlat || filterSociety || filterStatus) && (
              <button
                onClick={() => { setFilterName(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer"
              >Clear</button>
            )}
          </div>

          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="text-xs text-ink-muted">{filteredFlats.length} of {flats.length} properties</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">Show</span>
              <select
                className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[11px] text-ink-muted">per page</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pagedFlats.map((flat) => {
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
                      <button onClick={() => { setEditFlat(flat); setEditForm({ flat_number: flat.flat_number, block: flat.block ?? "", flat_type: flat.flat_type ?? "", floor_number: flat.floor_number != null ? String(flat.floor_number) : "", area_sqft: flat.area_sqft != null ? String(flat.area_sqft) : "", monthly_rent: flat.monthly_rent != null ? String(flat.monthly_rent) : "", security_deposit: flat.security_deposit != null ? String(flat.security_deposit) : "", society_id: "", society_name_custom: "" }); }}
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
                          <button
                            onClick={() => { setRentFlat(flat); setRentValue(String(flat.monthly_rent ?? "")); }}
                            className="text-[10px] text-brand-600 font-semibold underline cursor-pointer mt-0.5"
                          >Edit Rent</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-warm-50 border border-dashed border-border-default p-3 mb-3 text-center">
                      <div className="text-xs text-ink-muted">No tenant — property vacant</div>
                    </div>
                  )}

                  {/* All Action Buttons — single row, scroll on overflow */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    <button onClick={() => setDetailFlat(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">Details</button>
                    {tenantUser && (
                      <>
                        <button onClick={() => openTenantModal(flat)} className="px-2.5 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-600 text-[10px] font-semibold cursor-pointer hover:bg-brand-100 whitespace-nowrap flex-shrink-0">👤 Tenant</button>
                        <button onClick={() => { openTenantModal(flat); setTenantTab("payments"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">💰 Payments</button>
                        <button onClick={() => { openTenantModal(flat); setTenantTab("agreement"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">📄 Agreement</button>
                        <button onClick={() => { openTenantModal(flat); setTenantTab("documents"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🗂️ Docs</button>
                        <button onClick={() => { openTenantModal(flat); setTenantTab("complaints"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🚩 Complaints</button>
                        <a href={`https://wa.me/${(tenantUser.phone ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0">📱 Contact</a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)} className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
                  )
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
            </div>
          )}
          {filteredFlats.length > 0 && (
            <div className="text-center text-[10px] text-ink-muted mt-2">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredFlats.length)} of {filteredFlats.length}
            </div>
          )}
        </>
      )}

      {/* Tenant Detail Modal */}
      {tenantFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setTenantFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 pb-0">
              <div>
                <div className="text-base font-extrabold text-ink">👤 Tenant — Flat {tenantFlat.flat_number}{tenantFlat.block ? ` (${tenantFlat.block})` : ""}</div>
                <div className="text-xs text-ink-muted">{(tenantFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant"}</div>
              </div>
              <button onClick={() => setTenantFlat(null)} className="text-ink-muted text-lg cursor-pointer p-1">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
              {([
                { key: "profile", label: "Profile" },
                { key: "payments", label: "Payments" },
                { key: "agreement", label: "Agreement" },
                { key: "documents", label: "Documents" },
                { key: "complaints", label: "Complaints" },
              ] as { key: TenantModalTab; label: string }[]).map(tab => (
                <button key={tab.key} onClick={() => setTenantTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap flex-shrink-0 ${tenantTab === tab.key ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {tenantLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-warm-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  {tenantTab === "profile" && <TenantProfileTab tenantFlat={tenantFlat} />}

                  {tenantTab === "payments" && (
                    <div className="space-y-2">
                      {tenantPayments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No payment records found.</div>
                      ) : (
                        tenantPayments.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-warm-50 rounded-xl px-3 py-2.5 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-ink">{p.month_year}</div>
                              {p.payment_date && <div className="text-[10px] text-ink-muted">{p.payment_method ? `via ${p.payment_method} · ` : ""}{p.payment_date}</div>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-ink">{formatCurrency(p.amount)}</div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span>
                              </div>
                              {p.status === "paid" && (
                                <button onClick={() => setReceiptPayment(p)} className="px-2 py-1 rounded-lg border border-border-default text-[9px] font-semibold text-ink-muted hover:bg-white cursor-pointer whitespace-nowrap">🧾 Receipt</button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tenantTab === "agreement" && (
                    <div>
                      {!tenantAgreement ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No agreement found for this flat.</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Type", value: tenantAgreement.tier?.replace("_", " ") ?? "—" },
                              { label: "Status", value: tenantAgreement.status },
                              { label: "Monthly Rent", value: formatCurrency(tenantAgreement.monthly_rent) },
                              { label: "Security Deposit", value: formatCurrency(tenantAgreement.security_deposit ?? 0) },
                              { label: "Start Date", value: new Date(tenantAgreement.start_date).toLocaleDateString("en-IN") },
                              { label: "End Date", value: new Date(tenantAgreement.end_date).toLocaleDateString("en-IN") },
                            ].map(d => (
                              <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                                <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                                <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {tenantTab === "documents" && (
                    <div className="space-y-2">
                      {tenantDocuments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No documents uploaded by this tenant.</div>
                      ) : (
                        tenantDocuments.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center bg-warm-50 rounded-xl px-3 py-2.5">
                            <div>
                              <div className="text-xs font-bold text-ink">{doc.title || doc.file_name}</div>
                              <div className="text-[10px] text-ink-muted capitalize">
                                {doc.file_name ? doc.file_name.split(".").pop()?.toUpperCase() : ""}{doc.file_size ? ` · ${doc.file_size < 1024 * 1024 ? (doc.file_size / 1024).toFixed(1) + " KB" : (doc.file_size / (1024 * 1024)).toFixed(1) + " MB"}` : ""} · {new Date(doc.created_at).toLocaleDateString("en-IN")}
                              </div>
                            </div>
                            {doc.file_url ? (
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 text-[10px] font-semibold">View</a>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg border border-red-200 text-red-400 text-[10px] font-semibold">No file</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tenantTab === "complaints" && (
                    <div className="space-y-2">
                      {tenantComplaints.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No complaints raised for this flat.</div>
                      ) : (
                        tenantComplaints.map(c => (
                          <div key={c.id} className="bg-warm-50 rounded-xl px-3 py-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="text-xs font-bold text-ink">{c.subject}</div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.status === "open" ? "bg-red-100 text-red-700" : c.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{c.status.replace("_", " ")}</span>
                            </div>
                            <div className="text-[10px] text-ink-muted mt-0.5">{c.category} · {c.priority} priority · {new Date(c.created_at).toLocaleDateString("en-IN")}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 pt-0">
              <button onClick={() => setTenantFlat(null)} className="w-full py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal — from payments tab */}
      {receiptPayment && tenantFlat && (
        <ReceiptModal
          payment={receiptPayment}
          tenant={{ full_name: (tenantFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant" }}
          flat={{ flat_number: tenantFlat.flat_number, block: tenantFlat.block }}
          onClose={() => setReceiptPayment(null)}
        />
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

      {/* Quick Rent Change Modal */}
      {rentFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRentFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="text-base font-extrabold text-ink">💰 Update Rent</div>
              <button onClick={() => setRentFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            <div className="text-xs text-ink-muted">
              Flat <strong>{rentFlat.flat_number}{rentFlat.block ? ` (${rentFlat.block})` : ""}</strong>
              {" · "}Current: <strong>{formatCurrency(rentFlat.monthly_rent ?? 0)}/mo</strong>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-ink-muted block mb-1">New Monthly Rent (₹)</label>
              <input
                type="number"
                className="w-full border border-border-default rounded-xl px-3 py-2.5 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                placeholder="e.g. 28000"
                value={rentValue}
                onChange={e => setRentValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRentSave()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRentFlat(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleRentSave} disabled={rentSaving} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
                {rentSaving ? "Saving..." : "Save Rent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
