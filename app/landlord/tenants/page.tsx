"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordAgreements, getLandlordUserId, type LandlordFlat, type LandlordAgreement } from "@/lib/landlord-data";
import { addTenant } from "@/lib/auth-db";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

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
  const [tenantDocs, setTenantDocs] = useState<{ id: string; title: string; doc_type: string; file_url: string | null; file_size: number | null; created_at: string }[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Agreement modal
  const [agreementFlat, setAgreementFlat] = useState<LandlordFlat | null>(null);

  // Remove tenant confirm
  const [removeFlat, setRemoveFlat] = useState<LandlordFlat | null>(null);
  const [removing, setRemoving] = useState(false);

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
    // Fetch tenant's uploaded documents
    if (tenantRec?.user_id) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, doc_type, file_url, file_size, created_at")
        .eq("uploaded_by", tenantRec.user_id)
        .order("created_at", { ascending: false });
      setTenantDocs(docs ?? []);
    }
    setLoadingKyc(false);
  }

  async function handleRemoveTenant() {
    if (!removeFlat || !removeFlat.current_tenant_id) return;
    setRemoving(true);
    // Mark tenant inactive
    await supabase.from("tenants").update({ status: "inactive" }).eq("flat_id", removeFlat.id).eq("status", "active");
    // Clear flat
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

  if (loading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

  // Find agreement for a flat
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
        occupiedFlats.map((flat) => {
          const tenantUser = (flat.tenant as { id: string; user?: { full_name: string; phone: string; email: string } | null } | null)?.user;
          const society = flat.society as { name: string; city: string } | null;
          const agreement = getAgreement(flat);
          if (!tenantUser) return null;
          const initials = tenantUser.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);

          return (
            <div key={flat.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-base font-extrabold text-brand-500">{initials}</div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">{tenantUser.full_name}</div>
                  <div className="text-[11px] text-ink-muted">{flat.flat_number}{flat.block ? ` (${flat.block})` : ""}{society ? ` · ${society.name}` : ""}</div>
                  <div className="text-[11px] text-ink-muted">{tenantUser.phone} · {tenantUser.email}</div>
                </div>
                <button onClick={() => setRemoveFlat(flat)} className="p-1.5 rounded-lg border border-red-200 text-red-400 text-[11px] cursor-pointer hover:bg-red-50" title="Remove tenant">✕</button>
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

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => openKyc(flat)} className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View KYC</button>
                <button onClick={() => setAgreementFlat(flat)} className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">Agreement</button>
                <a href={`https://wa.me/${(tenantUser.phone ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold cursor-pointer">📱 WhatsApp</a>
              </div>
            </div>
          );
        })
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
                {/* Uploaded Documents */}
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
                            <div className="text-[10px] text-ink-muted">{d.doc_type?.toUpperCase()} · {new Date(d.created_at).toLocaleDateString("en-IN")}</div>
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

      {/* Agreement Modal */}
      {agreementFlat && (() => {
        const ag = getAgreement(agreementFlat);
        const tu = (agreementFlat.tenant as { user?: { full_name: string } | null } | null)?.user;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setAgreementFlat(null)}>
            <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="text-base font-extrabold text-ink">📄 Agreement</div>
                <button onClick={() => setAgreementFlat(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
              </div>
              {ag ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Tenant", value: tu?.full_name ?? "—" },
                      { label: "Flat", value: `${agreementFlat.flat_number}${agreementFlat.block ? ` (${agreementFlat.block})` : ""}` },
                      { label: "Start Date", value: new Date(ag.start_date).toLocaleDateString("en-IN") },
                      { label: "End Date", value: new Date(ag.end_date).toLocaleDateString("en-IN") },
                      { label: "Monthly Rent", value: formatCurrency(ag.monthly_rent) },
                      { label: "Security Deposit", value: formatCurrency(ag.security_deposit ?? 0) },
                      { label: "Status", value: ag.status },
                      { label: "Type", value: ag.tier ?? "Standard" },
                    ].map(d => (
                      <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                        <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                        <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-ink-muted text-sm">No agreement found for this tenant.</div>
              )}
              <button onClick={() => setAgreementFlat(null)} className="w-full mt-4 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        );
      })()}

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
