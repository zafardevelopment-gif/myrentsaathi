"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordAgreements, getLandlordUserId, type LandlordFlat, type LandlordAgreement } from "@/lib/landlord-data";
import { addTenant } from "@/lib/auth-db";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import ReceiptModal from "@/components/tenant/ReceiptModal";

type TenantDetail = {
  id: string;
  user_id: string;
  flat_id: string;
  landlord_id: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  status: string;
  aadhaar_encrypted: string | null;
  pan_number: string | null;
  emergency_contact: string | null;
  emergency_name: string | null;
};

type TenantModalTab = "payments" | "agreement" | "documents" | "complaints";
type RentPayment = { id: string; amount: number; month_year: string; status: string; payment_date: string | null; payment_method: string | null };
type Document = { id: string; file_name: string; file_url: string; category: string; created_at: string };
type Complaint = { id: string; subject: string; category: string; priority: string; status: string; created_at: string };

function AgreementModal({ flat, agreement, onClose }: { flat: LandlordFlat; agreement: LandlordAgreement | null; onClose: () => void }) {
  const tu = (flat.tenant as { user?: { full_name: string } | null } | null)?.user;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-base font-extrabold text-ink">📄 Agreement</div>
          <button onClick={onClose} className="text-ink-muted text-lg cursor-pointer">✕</button>
        </div>
        {agreement ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tenant", value: tu?.full_name ?? "—" },
              { label: "Flat", value: `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` },
              { label: "Start Date", value: new Date(agreement.start_date).toLocaleDateString("en-IN") },
              { label: "End Date", value: new Date(agreement.end_date).toLocaleDateString("en-IN") },
              { label: "Monthly Rent", value: formatCurrency(agreement.monthly_rent) },
              { label: "Security Deposit", value: formatCurrency(agreement.security_deposit ?? 0) },
              { label: "Status", value: agreement.status },
              { label: "Type", value: agreement.tier ?? "Standard" },
            ].map(d => (
              <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-ink-muted text-sm">No agreement found for this tenant.</div>
        )}
        <button onClick={onClose} className="w-full mt-4 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
      </div>
    </div>
  );
}

export default function LandlordTenants() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add tenant form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    flat_id: "", monthly_rent: "", security_deposit: "",
    lease_start: "", lease_end: "",
  });

  // KYC modal
  const [kycFlat, setKycFlat] = useState<LandlordFlat | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [tenantDocs, setTenantDocs] = useState<{ id: string; title: string; file_name: string | null; file_url: string | null; file_size: number | null; created_at: string }[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Agreement modal
  const [agreementFlat, setAgreementFlat] = useState<LandlordFlat | null>(null);

  // Tab modal (Payments / Docs / Complaints)
  const [tabFlat, setTabFlat] = useState<LandlordFlat | null>(null);
  const [tabActive, setTabActive] = useState<TenantModalTab>("payments");
  const [tabPayments, setTabPayments] = useState<RentPayment[]>([]);
  const [tabDocuments, setTabDocuments] = useState<Document[]>([]);
  const [tabComplaints, setTabComplaints] = useState<Complaint[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Receipt
  const [receiptPayment, setReceiptPayment] = useState<RentPayment | null>(null);
  const [receiptFlat, setReceiptFlat] = useState<LandlordFlat | null>(null);

  // Remove tenant confirm
  const [removeFlat, setRemoveFlat] = useState<LandlordFlat | null>(null);
  const [removing, setRemoving] = useState(false);

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadData() {
    if (!user?.email) return;
    const lid = await getLandlordUserId(user.email);
    setLandlordId(lid);
    const [f, a] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordAgreements(user.email).catch(() => [] as LandlordAgreement[]),
    ]);
    setFlats(f);
    setAgreements(a);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, [user]);

  async function openKyc(flat: LandlordFlat) {
    setKycFlat(flat);
    setTenantDetail(null);
    setTenantDocs([]);
    setLoadingKyc(true);
    const { data: tenantRec } = await supabase
      .from("tenants")
      .select("id, user_id, flat_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, status, aadhaar_encrypted, pan_number, emergency_contact, emergency_name")
      .eq("flat_id", flat.id)
      .eq("status", "active")
      .maybeSingle();
    setTenantDetail(tenantRec as TenantDetail | null);
    if (tenantRec?.user_id) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, file_name, file_url, file_size, created_at")
        .eq("uploaded_by", tenantRec.user_id)
        .order("created_at", { ascending: false });
      setTenantDocs(docs ?? []);
    }
    setLoadingKyc(false);
  }

  async function openTabModal(flat: LandlordFlat, tab: TenantModalTab) {
    setTabFlat(flat);
    setTabActive(tab);
    setTabLoading(true);
    setTabPayments([]); setTabDocuments([]); setTabComplaints([]);

    const tenantUserId = flat.current_tenant_id;
    let tenantId: string | null = null;
    if (tenantUserId) {
      const { data: tr } = await supabase.from("tenants").select("id").eq("user_id", tenantUserId).eq("flat_id", flat.id).maybeSingle();
      tenantId = tr?.id ?? null;
    }

    const [payments, docs, complaints] = await Promise.all([
      tenantId
        ? supabase.from("rent_payments").select("id, amount, month_year, status, payment_date, payment_method").eq("tenant_id", tenantId).order("month_year", { ascending: false }).limit(12)
        : Promise.resolve({ data: [] }),
      tenantUserId
        ? supabase.from("documents").select("id, title, file_name, file_url, file_size, created_at").eq("uploaded_by", tenantUserId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("tickets").select("id, subject, category, priority, status, created_at").eq("flat_id", flat.id).order("created_at", { ascending: false }),
    ]);

    setTabPayments((payments.data ?? []) as RentPayment[]);
    setTabDocuments((docs.data ?? []) as Document[]);
    setTabComplaints((complaints.data ?? []) as Complaint[]);
    setTabLoading(false);
  }

  async function handleRemoveTenant() {
    if (!removeFlat || !removeFlat.current_tenant_id) return;
    setRemoving(true);
    await supabase.from("tenants").update({ status: "inactive" }).eq("flat_id", removeFlat.id).eq("status", "active");
    await supabase.from("flats").update({ current_tenant_id: null, status: "vacant" }).eq("id", removeFlat.id);
    setRemoving(false);
    toast.success("Tenant removed.");
    setRemoveFlat(null);
    setLoading(true);
    await loadData();
  }

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId || !form.flat_id) return;
    const selectedFlat = flats.find(f => f.id === form.flat_id);
    if (!selectedFlat) return;
    setSaving(true);
    const result = await addTenant({
      full_name: form.full_name, email: form.email, phone: form.phone,
      flat_id: form.flat_id,
      society_id: selectedFlat.society_id || undefined,
      landlord_id: landlordId,
      monthly_rent: Number(form.monthly_rent),
      security_deposit: Number(form.security_deposit),
      lease_start: form.lease_start, lease_end: form.lease_end,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error ?? "Failed to add tenant."); return; }
    toast.success(`Tenant added! Auto password: ${form.full_name.split(" ")[0]}@123`);
    setForm({ full_name: "", email: "", phone: "", flat_id: "", monthly_rent: "", security_deposit: "", lease_start: "", lease_end: "" });
    setShowForm(false);
    setLoading(true);
    await loadData();
  }

  const occupiedFlats = flats.filter(f => f.current_tenant_id);
  const vacantFlats = flats.filter(f => !f.current_tenant_id);

  // Unique society options from occupied flats
  const societyOptions = Array.from(
    new Map(
      occupiedFlats
        .map(f => f.society as { name: string; city: string } | null)
        .filter(Boolean)
        .map(s => [s!.name, s!])
    ).values()
  );

  // Apply filters
  const filteredFlats = occupiedFlats.filter(flat => {
    const tu = (flat.tenant as { user?: { full_name: string; phone: string } | null } | null)?.user;
    const society = flat.society as { name: string } | null;
    const agreement = agreements.find(a => (a.flat as { flat_number: string } | null)?.flat_number === flat.flat_number);
    if (filterName && !tu?.full_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterFlat && !flat.flat_number.toLowerCase().includes(filterFlat.toLowerCase())) return false;
    if (filterSociety && society?.name !== filterSociety) return false;
    if (filterStatus === "active" && !agreement) return false;
    if (filterStatus === "expiring") {
      if (!agreement) return false;
      const daysLeft = Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000);
      if (daysLeft > 30 || daysLeft < 0) return false;
    }
    if (filterStatus === "expired") {
      if (!agreement) return false;
      if (new Date(agreement.end_date) >= new Date()) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFlats.length / pageSize));
  const pagedFlats = filteredFlats.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = filterName || filterFlat || filterSociety || filterStatus;

  if (loading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  const getAgreement = (flat: LandlordFlat) => agreements.find(a => {
    const af = a.flat as { flat_number: string } | null;
    return af?.flat_number === flat.flat_number;
  });

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">👥 Tenants</h2>
        {vacantFlats.length > 0 && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
            {showForm ? "Cancel" : "+ Add Tenant"}
          </button>
        )}
      </div>

      {/* Add Tenant Form */}
      {showForm && (
        <form onSubmit={handleAddTenant} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-4 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">Add New Tenant</div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Full Name *</label><input required className={inputClass} placeholder="Rajesh Sharma" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div><label className={labelClass}>Phone *</label><input required className={inputClass} placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div><label className={labelClass}>Email *</label><input required type="email" className={inputClass} placeholder="rajesh@gmail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div>
            <label className={labelClass}>Select Flat *</label>
            <select required className={inputClass} value={form.flat_id} onChange={e => {
              const flat = vacantFlats.find(f => f.id === e.target.value);
              setForm(f => ({ ...f, flat_id: e.target.value, monthly_rent: flat?.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent, security_deposit: flat?.security_deposit ? String(flat.security_deposit) : f.security_deposit }));
            }}>
              <option value="">— Choose vacant flat —</option>
              {vacantFlats.map(flat => <option key={flat.id} value={flat.id}>{flat.flat_number}{flat.block ? ` (${flat.block})` : ""} — {flat.flat_type ?? ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Monthly Rent (₹) *</label><input required type="number" className={inputClass} placeholder="28000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
            <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} placeholder="56000" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Lease Start *</label><input required type="date" className={inputClass} value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
            <div><label className={labelClass}>Lease End *</label><input required type="date" className={inputClass} value={form.lease_end} onChange={e => setForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700">
            Auto password: <strong>{form.full_name ? form.full_name.split(" ")[0] + "@123" : "FirstName@123"}</strong> — share with tenant
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{saving ? "Adding Tenant..." : "Add Tenant"}</button>
        </form>
      )}

      {occupiedFlats.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No tenants yet. {vacantFlats.length > 0 ? "Add a tenant to a vacant flat." : "Add properties first."}</div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white rounded-[14px] border border-border-default p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">Filters</span>
              {hasFilters && (
                <button onClick={() => { setFilterName(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1); }}
                  className="text-[10px] text-brand-500 font-semibold cursor-pointer">Clear all</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                placeholder="Search tenant name..."
                value={filterName}
                onChange={e => { setFilterName(e.target.value); setPage(1); }}
              />
              <input
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                placeholder="Flat number..."
                value={filterFlat}
                onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
              />
              <select
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none col-span-1"
                value={filterSociety}
                onChange={e => { setFilterSociety(e.target.value); setPage(1); }}
              >
                <option value="">All Societies</option>
                {societyOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <select
                className="border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-ink bg-warm-50 focus:outline-none col-span-1"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Lease Status</option>
                <option value="active">Active Agreement</option>
                <option value="expiring">Expiring in 30 days</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            {hasFilters && (
              <div className="text-[10px] text-ink-muted">{filteredFlats.length} of {occupiedFlats.length} tenants match</div>
            )}
          </div>

          {/* Page size + count */}
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="text-xs text-ink-muted">{filteredFlats.length} tenants</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">Show</span>
              <select
                className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-[11px] text-ink-muted">per page</span>
            </div>
          </div>

          {filteredFlats.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">No tenants match the current filters.</div>
          ) : (
            pagedFlats.map((flat) => {
              const tenantUser = (flat.tenant as { id: string; user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
              const society = flat.society as { name: string; city: string } | null;
              const agreement = getAgreement(flat);
              if (!tenantUser) return null;
              const initials = tenantUser.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);

              // Lease status badge
              let leaseBadge: { label: string; cls: string } | null = null;
              if (agreement) {
                const daysLeft = Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000);
                if (daysLeft < 0) leaseBadge = { label: "Expired", cls: "bg-red-100 text-red-700" };
                else if (daysLeft <= 30) leaseBadge = { label: `Expires in ${daysLeft}d`, cls: "bg-yellow-100 text-yellow-700" };
              }

              return (
                <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-ink">{tenantUser.full_name}</div>
                        {leaseBadge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${leaseBadge.cls}`}>{leaseBadge.label}</span>}
                      </div>
                      <div className="text-[11px] text-ink-muted">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}{society ? ` · ${society.name}` : ""}</div>
                      <div className="text-[11px] text-ink-muted">{tenantUser.phone} · {tenantUser.email}</div>
                    </div>
                    <button onClick={() => setRemoveFlat(flat)} className="p-1.5 rounded-lg border border-red-200 text-red-400 text-[11px] cursor-pointer hover:bg-red-50 flex-shrink-0" title="Remove tenant">✕</button>
                  </div>

                  <div className="flex gap-3 bg-warm-50 rounded-xl p-3 mb-3 flex-wrap">
                    {[
                      { label: "Monthly Rent", value: formatCurrency(flat.monthly_rent ?? 0) },
                      { label: "Deposit Held", value: formatCurrency(flat.security_deposit ?? 0) },
                      { label: "Lease End", value: agreement ? new Date(agreement.end_date).toLocaleDateString("en-IN") : "—" },
                    ].map(d => (
                      <div key={d.label} className="flex-1 min-w-[80px]">
                        <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                        <div className="text-sm font-extrabold text-brand-500 mt-0.5">{d.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* All buttons in one scrollable row */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    <button onClick={() => openKyc(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🪪 KYC</button>
                    <button onClick={() => { openTabModal(flat, "payments"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">💰 Payments</button>
                    <button onClick={() => setAgreementFlat(flat)} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">📄 Agreement</button>
                    <button onClick={() => { openTabModal(flat, "documents"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🗂️ Docs</button>
                    <button onClick={() => { openTabModal(flat, "complaints"); }} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[10px] font-semibold text-ink-muted cursor-pointer hover:bg-warm-50 whitespace-nowrap flex-shrink-0">🚩 Complaints</button>
                    <a href={`https://wa.me/${(tenantUser.phone ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0">📱 Contact</a>
                  </div>
                </div>
              );
            })
          )}

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
                    <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
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

      {/* Receipt Modal */}
      {receiptPayment && receiptFlat && (
        <ReceiptModal
          payment={receiptPayment}
          tenant={{ full_name: (receiptFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant" }}
          flat={{ flat_number: receiptFlat.flat_number, block: receiptFlat.block }}
          onClose={() => { setReceiptPayment(null); setReceiptFlat(null); }}
        />
      )}

      {/* KYC Modal */}
      {kycFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setKycFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-base font-extrabold text-ink">🪪 Tenant KYC</div>
              <button onClick={() => setKycFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
            </div>
            {loadingKyc ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}</div>
            ) : tenantDetail ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Lease Start", value: tenantDetail.lease_start ? new Date(tenantDetail.lease_start).toLocaleDateString("en-IN") : "—" },
                    { label: "Lease End", value: tenantDetail.lease_end ? new Date(tenantDetail.lease_end).toLocaleDateString("en-IN") : "—" },
                    { label: "Monthly Rent", value: formatCurrency(tenantDetail.monthly_rent ?? 0) },
                    { label: "Security Deposit", value: formatCurrency(tenantDetail.security_deposit ?? 0) },
                  ].map(d => (
                    <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                      <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                      <div className="text-sm font-bold text-ink mt-0.5">{d.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-warm-50 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">KYC Documents</div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Aadhaar</span><span className="font-bold text-ink">{tenantDetail.aadhaar_encrypted ? "✅ On file" : "—"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">PAN</span><span className="font-bold text-ink">{tenantDetail.pan_number ?? "—"}</span></div>
                </div>
                <div className="bg-warm-50 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Emergency Contact</div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Name</span><span className="font-bold text-ink">{tenantDetail.emergency_name ?? "—"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Phone</span><span className="font-bold text-ink">{tenantDetail.emergency_contact ?? "—"}</span></div>
                </div>
                <div className="bg-warm-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mb-2">Uploaded Documents</div>
                  {tenantDocs.length === 0 ? (
                    <div className="text-xs text-ink-muted">No documents uploaded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {tenantDocs.map(d => (
                        <div key={d.id} className="flex justify-between items-center">
                          <div>
                            <div className="text-xs font-semibold text-ink">{d.title}</div>
                            <div className="text-[10px] text-ink-muted">{d.file_name ? d.file_name.split(".").pop()?.toUpperCase() : "—"} · {new Date(d.created_at).toLocaleDateString("en-IN")}</div>
                          </div>
                          {d.file_url ? (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-semibold text-brand-500 cursor-pointer">View</a>
                          ) : (
                            <span className="text-[10px] text-ink-muted">No file</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-ink-muted text-sm">No KYC details found for this tenant.</div>
            )}
            <button onClick={() => setKycFlat(null)} className="w-full mt-4 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Tab Modal — Payments / Docs / Complaints */}
      {tabFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setTabFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 pb-0">
              <div>
                <div className="text-base font-extrabold text-ink">
                  {tabActive === "payments" ? "💰 Payments" : tabActive === "documents" ? "🗂️ Documents" : "🚩 Complaints"}
                  {" — "}{(tabFlat.tenant as { user?: { full_name: string } | null } | null)?.user?.full_name ?? "Tenant"}
                </div>
                <div className="text-xs text-ink-muted">Flat {tabFlat.flat_number}{tabFlat.block ? ` (${tabFlat.block})` : ""}</div>
              </div>
              <button onClick={() => setTabFlat(null)} className="text-ink-muted text-lg cursor-pointer p-1">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3">
              {([
                { key: "payments" as TenantModalTab, label: "💰 Payments" },
                { key: "documents" as TenantModalTab, label: "🗂️ Docs" },
                { key: "complaints" as TenantModalTab, label: "🚩 Complaints" },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setTabActive(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap flex-shrink-0 ${tabActive === tab.key ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tabLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-warm-100 rounded-xl animate-pulse" />)}</div>
              ) : (
                <>
                  {tabActive === "payments" && (
                    <div className="space-y-2">
                      {tabPayments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No payment records found.</div>
                      ) : (
                        tabPayments.map(p => (
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
                                <button onClick={() => { setReceiptPayment(p); setReceiptFlat(tabFlat); }} className="px-2 py-1 rounded-lg border border-border-default text-[9px] font-semibold text-ink-muted hover:bg-white cursor-pointer whitespace-nowrap">🧾 Receipt</button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tabActive === "documents" && (
                    <div className="space-y-2">
                      {tabDocuments.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No documents uploaded for this flat.</div>
                      ) : (
                        tabDocuments.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center bg-warm-50 rounded-xl px-3 py-2.5">
                            <div>
                              <div className="text-xs font-bold text-ink">{doc.file_name}</div>
                              <div className="text-[10px] text-ink-muted capitalize">{doc.category} · {new Date(doc.created_at).toLocaleDateString("en-IN")}</div>
                            </div>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 text-[10px] font-semibold">Download</a>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tabActive === "complaints" && (
                    <div className="space-y-2">
                      {tabComplaints.length === 0 ? (
                        <div className="text-center py-8 text-ink-muted text-sm">No complaints raised for this flat.</div>
                      ) : (
                        tabComplaints.map(c => (
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
              <button onClick={() => setTabFlat(null)} className="w-full py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Modal */}
      {agreementFlat && (
        <AgreementModal flat={agreementFlat} agreement={getAgreement(agreementFlat) ?? null} onClose={() => setAgreementFlat(null)} />
      )}

      {/* Remove Tenant Confirm */}
      {removeFlat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRemoveFlat(null)}>
          <div className="bg-white rounded-[18px] w-full max-w-sm p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-base font-extrabold text-ink mb-1">Remove Tenant?</div>
            <div className="text-sm text-ink-muted mb-4">This will mark the tenant as inactive and free up the flat.</div>
            <div className="flex gap-2">
              <button onClick={() => setRemoveFlat(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleRemoveTenant} disabled={removing} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60">{removing ? "Removing..." : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
