"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getLandlordAgreements, getLandlordFlats, getLandlordUserId,
  type LandlordAgreement, type LandlordFlat,
} from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import {
  DEFAULT_DOC_TITLE, DEFAULT_DOC_SUBTITLE, DEFAULT_SECTION_TITLES, TIER_LABEL,
  fmtDate, durationMonths, defaultClauses, printAgreementPdf,
  type SectionTitles,
} from "@/lib/agreement-pdf";

// ─── helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border-green-200",
  expired:    "bg-gray-100 text-gray-500 border-gray-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  terminated: "bg-red-100 text-red-600 border-red-200",
};

// ─── PDF print ──────────────────────────────────────────────

function printAgreement(ag: LandlordAgreement) {
  const flat = ag.flat as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
  const society = ag.society as { name: string; city: string; address?: string | null } | null;
  const tenant = ag.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
  const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;

  try {
    printAgreementPdf({
      ...ag,
      flat,
      society,
      tenantContact: tenant,
      landlordContact: landlord,
    });
  } catch {
    toast.error("Pop-up blocked. Allow pop-ups and try again.");
  }
}

// ─── Main Component ──────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export default function LandlordAgreements() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewAg, setViewAg] = useState<LandlordAgreement | null>(null);
  const [terminating, setTerminating] = useState(false);

  // Inline edit of an agreement's snapshot fields
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    tenant_name: "", tenant_phone: "", tenant_email: "",
    landlord_name: "", landlord_phone: "", landlord_email: "",
    monthly_rent: "", security_deposit: "", start_date: "", end_date: "",
    rent_hike_clause: "",
    doc_title: "", doc_subtitle: "",
    section_titles: { ...DEFAULT_SECTION_TITLES } as SectionTitles,
    clauses: [] as string[],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Custom document upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docRemoving, setDocRemoving] = useState(false);

  // Filters
  const [filterTenant, setFilterTenant] = useState("");
  const [filterFlat, setFilterFlat] = useState("");
  const [filterSociety, setFilterSociety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    flat_id: "", tenant_user_id: "", tier: "free",
    start_date: "", end_date: "",
    monthly_rent: "", security_deposit: "",
  });

  async function loadData() {
    if (!user?.email) return;
    const [ag, f, lid] = await Promise.all([
      getLandlordAgreements(user.email).catch(() => [] as LandlordAgreement[]),
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setAgreements(ag);
    setFlats(f);
    setLandlordId(lid);
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, [user]);

  function onFlatChange(flatId: string) {
    const flat = flats.find(f => f.id === flatId);
    setForm(f => ({
      ...f,
      flat_id: flatId,
      tenant_user_id: flat?.current_tenant_id ?? "",
      monthly_rent: flat?.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent,
      security_deposit: flat?.security_deposit ? String(flat.security_deposit) : f.security_deposit,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId || !form.flat_id) return;
    const selectedFlat = flats.find(f => f.id === form.flat_id);
    setSaving(true);

    let tenantRecordId: string | null = null;
    if (form.flat_id) {
      const { data: tenantRec } = await supabase
        .from("tenants").select("id")
        .eq("flat_id", form.flat_id).eq("status", "active").maybeSingle();
      tenantRecordId = tenantRec?.id ?? null;
    }

    const { error } = await supabase.from("agreements").insert({
      landlord_id: landlordId,
      flat_id: form.flat_id,
      society_id: selectedFlat?.society_id ?? null,
      tenant_id: tenantRecordId,
      tier: form.tier,
      agreement_type: form.tier,
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: Number(form.monthly_rent),
      security_deposit: Number(form.security_deposit) || null,
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Agreement created!");
    setForm({ flat_id: "", tenant_user_id: "", tier: "free", start_date: "", end_date: "", monthly_rent: "", security_deposit: "" });
    setShowForm(false);
    setLoading(true);
    await loadData();
  }

  function startEdit(ag: LandlordAgreement) {
    const tenant = ag.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
    const landlord = ag.landlord as { full_name?: string; phone?: string; email?: string } | null;
    const society = ag.society as { city?: string } | null;
    setEditForm({
      tenant_name: ag.tenant_name ?? tenant?.full_name ?? "",
      tenant_phone: ag.tenant_phone ?? tenant?.phone ?? "",
      tenant_email: ag.tenant_email ?? tenant?.email ?? "",
      landlord_name: ag.landlord_name ?? landlord?.full_name ?? "",
      landlord_phone: ag.landlord_phone ?? landlord?.phone ?? "",
      landlord_email: ag.landlord_email ?? landlord?.email ?? "",
      monthly_rent: String(ag.monthly_rent ?? ""),
      security_deposit: ag.security_deposit != null ? String(ag.security_deposit) : "",
      start_date: ag.start_date ?? "",
      end_date: ag.end_date ?? "",
      rent_hike_clause: ag.rent_hike_clause ?? "",
      doc_title: ag.doc_title ?? DEFAULT_DOC_TITLE,
      doc_subtitle: ag.doc_subtitle ?? DEFAULT_DOC_SUBTITLE,
      section_titles: { ...DEFAULT_SECTION_TITLES, ...(ag.section_titles ?? {}) },
      clauses: ag.clauses && ag.clauses.length > 0 ? ag.clauses : defaultClauses(ag, society?.city ?? null),
    });
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!viewAg) return;
    setSavingEdit(true);
    const cleanedClauses = editForm.clauses.map(c => c.trim()).filter(Boolean);
    const { error } = await supabase.from("agreements").update({
      tenant_name: editForm.tenant_name || null,
      tenant_phone: editForm.tenant_phone || null,
      tenant_email: editForm.tenant_email || null,
      landlord_name: editForm.landlord_name || null,
      landlord_phone: editForm.landlord_phone || null,
      landlord_email: editForm.landlord_email || null,
      monthly_rent: Number(editForm.monthly_rent) || 0,
      security_deposit: Number(editForm.security_deposit) || null,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      rent_hike_clause: editForm.rent_hike_clause || null,
      doc_title: editForm.doc_title.trim() || null,
      doc_subtitle: editForm.doc_subtitle.trim() || null,
      section_titles: editForm.section_titles,
      clauses: cleanedClauses,
    }).eq("id", viewAg.id);
    setSavingEdit(false);
    if (error) { toast.error("Failed to save changes."); return; }
    const updated: LandlordAgreement = {
      ...viewAg,
      tenant_name: editForm.tenant_name || null,
      tenant_phone: editForm.tenant_phone || null,
      tenant_email: editForm.tenant_email || null,
      landlord_name: editForm.landlord_name || null,
      landlord_phone: editForm.landlord_phone || null,
      landlord_email: editForm.landlord_email || null,
      monthly_rent: Number(editForm.monthly_rent) || 0,
      security_deposit: Number(editForm.security_deposit) || null,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      rent_hike_clause: editForm.rent_hike_clause || null,
      doc_title: editForm.doc_title.trim() || null,
      doc_subtitle: editForm.doc_subtitle.trim() || null,
      section_titles: editForm.section_titles,
      clauses: cleanedClauses,
      tenant: { user: { full_name: editForm.tenant_name, phone: editForm.tenant_phone, email: editForm.tenant_email } },
      landlord: { full_name: editForm.landlord_name, phone: editForm.landlord_phone, email: editForm.landlord_email },
    };
    setViewAg(updated);
    setAgreements(prev => prev.map(a => a.id === viewAg.id ? updated : a));
    toast.success("Agreement updated.");
    setEditing(false);
  }

  async function handleTerminate(agId: string) {
    setTerminating(true);
    await supabase.from("agreements").update({ status: "terminated" }).eq("id", agId);
    toast.success("Agreement terminated.");
    setTerminating(false);
    setViewAg(null);
    setLoading(true);
    await loadData();
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!viewAg || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB."); return; }
    setDocUploading(true);
    const path = `agreements/${viewAg.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("agreements-docs").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed: " + upErr.message); setDocUploading(false); return; }
    const { data: urlData } = supabase.storage.from("agreements-docs").getPublicUrl(path);
    const publicUrl = urlData?.publicUrl ?? null;
    const { error: dbErr } = await supabase.from("agreements")
      .update({ custom_doc_url: publicUrl, custom_doc_name: file.name })
      .eq("id", viewAg.id);
    if (dbErr) { toast.error("Failed to save document link."); setDocUploading(false); return; }
    const updated = { ...viewAg, custom_doc_url: publicUrl, custom_doc_name: file.name };
    setViewAg(updated);
    setAgreements(prev => prev.map(a => a.id === viewAg.id ? updated : a));
    toast.success("Document uploaded!");
    setDocUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDocRemove() {
    if (!viewAg?.custom_doc_url) return;
    setDocRemoving(true);
    await supabase.from("agreements")
      .update({ custom_doc_url: null, custom_doc_name: null })
      .eq("id", viewAg.id);
    const updated = { ...viewAg, custom_doc_url: null, custom_doc_name: null };
    setViewAg(updated);
    setAgreements(prev => prev.map(a => a.id === viewAg.id ? updated : a));
    toast.success("Document removed.");
    setDocRemoving(false);
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1 uppercase tracking-wide";

  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">📄 Rental Agreements</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{agreements.length} agreement{agreements.length !== 1 ? "s" : ""} found</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5">
          {showForm ? "✕ Cancel" : "+ New Agreement"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[16px] p-5 border border-brand-200 mb-5 shadow-sm">
          <div className="text-sm font-extrabold text-ink mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-base">📝</span>
            New Rental Agreement
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Select Flat *</label>
              <select required className={inputClass} value={form.flat_id} onChange={e => onFlatChange(e.target.value)}>
                <option value="">— Choose a flat —</option>
                {flats.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flat_number}{f.block ? ` (${f.block})` : ""}{f.flat_type ? ` · ${f.flat_type}` : ""} {f.current_tenant_id ? "🟢 Occupied" : "⚪ Vacant"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Agreement Type</label>
              <select className={`${inputClass} opacity-70 cursor-not-allowed`} value="free" disabled>
                <option value="free">Free Draft</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input required type="date" className={inputClass} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>End Date *</label>
                <input required type="date" className={inputClass} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monthly Rent (₹) *</label>
                <input required type="number" className={inputClass} placeholder="25000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Security Deposit (₹)</label>
                <input type="number" className={inputClass} placeholder="50000" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} />
              </div>
            </div>

            {flats.filter(f => f.current_tenant_id).length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-[11px] text-yellow-700">
                ⚠️ No occupied flats found. Add a tenant first to create an agreement.
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60 mt-1">
              {saving ? "Creating..." : "✓ Create Agreement"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      {agreements.length > 0 && (
        <div className="bg-white rounded-[14px] border border-border-default p-3.5 mb-4">
          <div className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-2.5">Filters</div>
          <div className="flex gap-2 flex-wrap">
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 flex-1 min-w-[130px]"
              placeholder="🔍 Tenant name..."
              value={filterTenant} onChange={e => { setFilterTenant(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-28"
              placeholder="Flat no."
              value={filterFlat} onChange={e => { setFilterFlat(e.target.value); setPage(1); }}
            />
            <input
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-36"
              placeholder="Society / city..."
              value={filterSociety} onChange={e => { setFilterSociety(e.target.value); setPage(1); }}
            />
            <select
              className="border border-border-default rounded-xl px-3 py-2 text-xs text-ink bg-warm-50 focus:outline-none focus:border-brand-500 w-32"
              value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="pending">Pending</option>
            </select>
            {(filterTenant || filterFlat || filterSociety || filterStatus) && (
              <button
                onClick={() => { setFilterTenant(""); setFilterFlat(""); setFilterSociety(""); setFilterStatus(""); setPage(1); }}
                className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold cursor-pointer"
              >Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Agreement List */}
      {(() => {
        const filtered = agreements.filter(ag => {
          const tenant  = ag.tenant?.user as { full_name: string } | null;
          const flat    = ag.flat as { flat_number: string; block: string | null } | null;
          const society = ag.society as { name: string; city: string } | null;
          const tName = tenant?.full_name ?? "";
          const fLabel = flat ? `${flat.flat_number} ${flat.block ?? ""}` : "";
          const sLabel = society ? `${society.name} ${society.city}` : "";
          if (filterTenant && !tName.toLowerCase().includes(filterTenant.toLowerCase())) return false;
          if (filterFlat && !fLabel.toLowerCase().includes(filterFlat.toLowerCase())) return false;
          if (filterSociety && !sLabel.toLowerCase().includes(filterSociety.toLowerCase())) return false;
          if (filterStatus && ag.status !== filterStatus) return false;
          return true;
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

        if (agreements.length === 0) return (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-sm font-semibold">No agreements yet</div>
            <div className="text-xs mt-1">Click "+ New Agreement" to generate your first one</div>
          </div>
        );

        return (
          <>
            {/* Count + page size */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div className="text-xs text-ink-muted">{filtered.length} of {agreements.length} agreements</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">Show</span>
                <select className="border border-border-default rounded-lg px-2 py-1 text-xs text-ink bg-warm-50 focus:outline-none"
                  value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[11px] text-ink-muted">per page</span>
              </div>
            </div>

            {paged.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-sm">No agreements match your filters.</div>
            ) : (
        <div className="space-y-2">
          {paged.map((ag) => {
            const flat    = ag.flat as { flat_number: string; block: string | null } | null;
            const society = ag.society as { name: string; city: string } | null;
            const tenant  = ag.tenant?.user as { full_name: string } | null;
            const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
            const daysLeft = ag.end_date ? Math.ceil((new Date(ag.end_date).getTime() - Date.now()) / 86400000) : null;
            const months = ag.start_date && ag.end_date ? durationMonths(ag.start_date, ag.end_date) : null;

            return (
              <div key={ag.id} className="bg-white rounded-[14px] p-4 border border-border-default hover:border-brand-200 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-xl flex-shrink-0">📄</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-ink">{flatLabel}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[ag.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warm-100 text-ink-muted border border-border-default">
                          {TIER_LABEL[ag.tier] ?? ag.tier}
                        </span>
                      </div>
                      {tenant && <div className="text-[11px] text-ink-muted mt-0.5">👤 {tenant.full_name}</div>}
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        📅 {fmtDate(ag.start_date)} → {fmtDate(ag.end_date)}
                        {months ? ` · ${months} months` : ""}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        💰 {formatCurrency(ag.monthly_rent)}/mo
                        {ag.security_deposit ? ` · Deposit: ${formatCurrency(ag.security_deposit)}` : ""}
                        {society ? ` · ${society.name}` : ""}
                      </div>
                      {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && ag.status === "active" && (
                        <div className="text-[10px] text-orange-600 font-bold mt-1">⚠️ Expires in {daysLeft} days</div>
                      )}
                      {daysLeft !== null && daysLeft <= 0 && ag.status === "active" && (
                        <div className="text-[10px] text-red-600 font-bold mt-1">🔴 Lease has expired</div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setViewAg(ag)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl border border-border-default text-[11px] font-bold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors">
                    View →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">‹ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => p === "..." ? (
                    <span key={`e-${i}`} className="text-[11px] text-ink-muted px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${page === p ? "bg-brand-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">Next ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50">»</button>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="text-center text-[10px] text-ink-muted mt-2">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </div>
            )}
          </>
        );
      })()}

      {/* ─── PROFESSIONAL AGREEMENT MODAL ─────────────────────── */}
      {viewAg && (() => {
        const flat     = viewAg.flat    as { flat_number: string; block: string | null; floor_number?: number | null; flat_type?: string | null; area_sqft?: number | null } | null;
        const society  = viewAg.society as { name: string; city: string; address?: string | null } | null;
        const tenant   = viewAg.tenant?.user as { full_name: string; phone?: string | null; email?: string | null } | null;
        const landlord = viewAg.landlord as { full_name?: string; phone?: string; email?: string } | null;
        const months   = viewAg.start_date && viewAg.end_date ? durationMonths(viewAg.start_date, viewAg.end_date) : null;
        const flatLabel = flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-3 md:p-6"
            onClick={() => { setViewAg(null); setEditing(false); }}>
            <div className="bg-white rounded-[20px] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="sticky top-0 bg-white rounded-t-[20px] border-b border-border-default px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-lg">📄</div>
                  <div>
                    <div className="text-sm font-extrabold text-ink">Rental Agreement</div>
                    <div className="text-[10px] text-ink-muted">#{viewAg.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[viewAg.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {viewAg.status.charAt(0).toUpperCase() + viewAg.status.slice(1)}
                  </span>
                  <button onClick={() => { setViewAg(null); setEditing(false); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-muted hover:bg-warm-50 cursor-pointer text-lg">✕</button>
                </div>
              </div>

              <div className="px-5 py-4 space-y-5">

                {/* Document Title */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Document Heading</div>
                  {editing ? (
                    <div className="bg-warm-50 rounded-[14px] border border-border-default p-3.5 space-y-2">
                      <div><label className={labelClass}>Main Title</label><input className={inputClass} placeholder={DEFAULT_DOC_TITLE} value={editForm.doc_title} onChange={e => setEditForm(f => ({ ...f, doc_title: e.target.value }))} /></div>
                      <div><label className={labelClass}>Subtitle</label><input className={inputClass} placeholder={DEFAULT_DOC_SUBTITLE} value={editForm.doc_subtitle} onChange={e => setEditForm(f => ({ ...f, doc_subtitle: e.target.value }))} /></div>
                    </div>
                  ) : (
                    <div className="bg-warm-50 rounded-[14px] border border-border-default p-3.5">
                      <div className="text-sm font-extrabold text-ink">{viewAg.doc_title?.trim() || DEFAULT_DOC_TITLE}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">{viewAg.doc_subtitle?.trim() || DEFAULT_DOC_SUBTITLE}</div>
                    </div>
                  )}
                </div>

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {editing ? (
                      <input className={`${inputClass} text-[10px] font-bold uppercase tracking-widest`} value={editForm.section_titles.parties} onChange={e => setEditForm(f => ({ ...f, section_titles: { ...f.section_titles, parties: e.target.value } }))} />
                    ) : (
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">{viewAg.section_titles?.parties ?? DEFAULT_SECTION_TITLES.parties}</div>
                    )}
                  </div>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-100 rounded-[14px] p-3.5 space-y-2">
                        <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Landlord</div>
                        <input className={inputClass} placeholder="Name" value={editForm.landlord_name} onChange={e => setEditForm(f => ({ ...f, landlord_name: e.target.value }))} />
                        <input className={inputClass} placeholder="Phone" value={editForm.landlord_phone} onChange={e => setEditForm(f => ({ ...f, landlord_phone: e.target.value }))} />
                        <input className={inputClass} placeholder="Email" value={editForm.landlord_email} onChange={e => setEditForm(f => ({ ...f, landlord_email: e.target.value }))} />
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-3.5 space-y-2">
                        <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Tenant</div>
                        <input className={inputClass} placeholder="Name" value={editForm.tenant_name} onChange={e => setEditForm(f => ({ ...f, tenant_name: e.target.value }))} />
                        <input className={inputClass} placeholder="Phone" value={editForm.tenant_phone} onChange={e => setEditForm(f => ({ ...f, tenant_phone: e.target.value }))} />
                        <input className={inputClass} placeholder="Email" value={editForm.tenant_email} onChange={e => setEditForm(f => ({ ...f, tenant_email: e.target.value }))} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Landlord */}
                      <div className="bg-green-50 border border-green-100 rounded-[14px] p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800">
                            {landlord?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "L"}
                          </div>
                          <div className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Landlord</div>
                        </div>
                        <div className="text-sm font-extrabold text-ink">{landlord?.full_name ?? "—"}</div>
                        {landlord?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {landlord.phone}</div>}
                        {landlord?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {landlord.email}</div>}
                      </div>
                      {/* Tenant */}
                      <div className="bg-blue-50 border border-blue-100 rounded-[14px] p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-extrabold text-blue-800">
                            {tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "T"}
                          </div>
                          <div className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Tenant</div>
                        </div>
                        <div className="text-sm font-extrabold text-ink">{tenant?.full_name ?? "—"}</div>
                        {tenant?.phone && <div className="text-[10px] text-ink-muted mt-0.5">📞 {tenant.phone}</div>}
                        {tenant?.email && <div className="text-[10px] text-ink-muted truncate">✉️ {tenant.email}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Property */}
                <div>
                  {editing ? (
                    <input className={`${inputClass} text-[10px] font-bold uppercase tracking-widest mb-3`} value={editForm.section_titles.property} onChange={e => setEditForm(f => ({ ...f, section_titles: { ...f.section_titles, property: e.target.value } }))} />
                  ) : (
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{viewAg.section_titles?.property ?? DEFAULT_SECTION_TITLES.property}</div>
                  )}
                  <div className="bg-warm-50 rounded-[14px] border border-border-default p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">🏠</div>
                      <div>
                        <div className="text-sm font-extrabold text-ink">Flat {flatLabel}</div>
                        <div className="text-[11px] text-ink-muted">
                          {society ? `${society.name}, ${society.city}` : "Independent Property"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Type",     value: flat?.flat_type ?? "—" },
                        { label: "Floor",    value: flat?.floor_number != null ? `Floor ${flat.floor_number}` : "—" },
                        { label: "Area",     value: flat?.area_sqft ? `${flat.area_sqft} sq.ft` : "—" },
                      ].map(d => (
                        <div key={d.label} className="bg-white rounded-xl p-2 text-center border border-border-default">
                          <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                          <div className="text-xs font-bold text-ink mt-0.5">{d.value}</div>
                        </div>
                      ))}
                    </div>
                    {society?.address && (
                      <div className="text-[10px] text-ink-muted mt-2">📍 {society.address}</div>
                    )}
                  </div>
                </div>

                {/* Financial Terms */}
                <div>
                  {editing ? (
                    <input className={`${inputClass} text-[10px] font-bold uppercase tracking-widest mb-3`} value={editForm.section_titles.financial} onChange={e => setEditForm(f => ({ ...f, section_titles: { ...f.section_titles, financial: e.target.value } }))} />
                  ) : (
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{viewAg.section_titles?.financial ?? DEFAULT_SECTION_TITLES.financial}</div>
                  )}
                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelClass}>Monthly Rent (₹)</label><input type="number" className={inputClass} value={editForm.monthly_rent} onChange={e => setEditForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
                        <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} value={editForm.security_deposit} onChange={e => setEditForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelClass}>Start Date</label><input type="date" className={inputClass} value={editForm.start_date} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                        <div><label className={labelClass}>End Date</label><input type="date" className={inputClass} value={editForm.end_date} onClick={e => e.currentTarget.showPicker?.()} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Monthly Rent",     value: formatCurrency(viewAg.monthly_rent),                    highlight: true },
                        { label: "Security Deposit", value: viewAg.security_deposit ? formatCurrency(viewAg.security_deposit) : "—", highlight: false },
                        { label: "Start Date",       value: fmtDate(viewAg.start_date),                             highlight: false },
                        { label: "End Date",         value: fmtDate(viewAg.end_date),                               highlight: false },
                        { label: "Duration",         value: months ? `${months} months` : "—",                     highlight: false },
                        { label: "Total Value",      value: months ? formatCurrency(viewAg.monthly_rent * months) : "—", highlight: false },
                      ].map(d => (
                        <div key={d.label} className={`rounded-[12px] p-3 border ${d.highlight ? "bg-brand-50 border-brand-200" : "bg-warm-50 border-border-default"}`}>
                          <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                          <div className={`text-sm font-extrabold mt-0.5 ${d.highlight ? "text-brand-600" : "text-ink"}`}>{d.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rent Escalation Clause */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Rent Escalation</div>
                  {editing ? (
                    <textarea
                      className={inputClass}
                      rows={3}
                      placeholder="e.g. Rent shall increase by 10% every 12 months, starting 1 Jun 2027."
                      value={editForm.rent_hike_clause}
                      onChange={e => setEditForm(f => ({ ...f, rent_hike_clause: e.target.value }))}
                    />
                  ) : viewAg.rent_hike_clause ? (
                    <div className="bg-orange-50 border border-orange-100 rounded-[14px] p-3.5 text-xs text-ink">
                      📈 {viewAg.rent_hike_clause}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-muted">No rent escalation clause set.</div>
                  )}
                </div>

                {/* Terms & Conditions */}
                <div>
                  {editing ? (
                    <input className={`${inputClass} text-[10px] font-bold uppercase tracking-widest mb-3`} value={editForm.section_titles.terms} onChange={e => setEditForm(f => ({ ...f, section_titles: { ...f.section_titles, terms: e.target.value } }))} />
                  ) : (
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">{viewAg.section_titles?.terms ?? DEFAULT_SECTION_TITLES.terms}</div>
                  )}
                  {editing ? (
                    <div className="space-y-2">
                      {editForm.clauses.map((clause, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-[11px] font-bold text-ink-muted mt-2 w-4 flex-shrink-0">{i + 1}.</span>
                          <textarea
                            className={inputClass}
                            rows={2}
                            value={clause}
                            onChange={e => setEditForm(f => ({ ...f, clauses: f.clauses.map((c, ci) => ci === i ? e.target.value : c) }))}
                          />
                          <button
                            onClick={() => setEditForm(f => ({ ...f, clauses: f.clauses.filter((_, ci) => ci !== i) }))}
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg border border-red-200 text-red-500 text-xs cursor-pointer hover:bg-red-50 mt-0.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setEditForm(f => ({ ...f, clauses: [...f.clauses, ""] }))}
                        className="w-full py-2 rounded-xl border border-dashed border-border-default text-[11px] font-bold text-ink-muted cursor-pointer hover:bg-warm-50"
                      >
                        + Add Clause
                      </button>
                      <div className="text-[10px] text-ink-muted">You can use &lt;strong&gt;text&lt;/strong&gt; to bold parts of a clause.</div>
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-2">
                      {(viewAg.clauses && viewAg.clauses.length > 0
                        ? viewAg.clauses
                        : defaultClauses(viewAg, (viewAg.society as { city?: string } | null)?.city ?? null)
                      ).map((clause, i) => (
                        <li key={i} className="text-xs text-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: clause }} />
                      ))}
                    </ol>
                  )}
                </div>

                {/* Agreement type + ID */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    Type: {TIER_LABEL[viewAg.tier] ?? viewAg.tier}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    ID: {viewAg.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-warm-100 border border-border-default text-[11px] font-semibold text-ink-muted">
                    Created: {fmtDate(viewAg.created_at)}
                  </span>
                </div>

                {/* ── Custom Document ── */}
                <div>
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Custom Document</div>
                  {viewAg.custom_doc_url ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-[14px] p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-lg flex-shrink-0">📎</div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink truncate">{viewAg.custom_doc_name ?? "Custom Document"}</div>
                          <div className="text-[10px] text-ink-muted mt-0.5">Visible to tenant</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={viewAg.custom_doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer hover:bg-purple-200 transition-colors"
                        >
                          View
                        </a>
                        <button
                          onClick={handleDocRemove}
                          disabled={docRemoving}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-500 text-[11px] font-bold cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {docRemoving ? "..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border-default rounded-[14px] p-4 text-center">
                      <div className="text-2xl mb-1">📎</div>
                      <div className="text-xs font-semibold text-ink mb-0.5">Attach your own agreement document</div>
                      <div className="text-[10px] text-ink-muted mb-3">PDF, Word, or image · Max 10 MB · Tenant will be able to view &amp; download it</div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleDocUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={docUploading}
                        className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold cursor-pointer hover:bg-purple-600 transition-colors disabled:opacity-50"
                      >
                        {docUploading ? "Uploading..." : "Upload Document"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="sticky bottom-0 bg-white rounded-b-[20px] border-t border-border-default px-5 py-3.5 flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)}
                      className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer hover:bg-warm-200 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={savingEdit}
                      className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600 transition-colors disabled:opacity-60">
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setViewAg(null)}
                      className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer hover:bg-warm-200 transition-colors">
                      Close
                    </button>
                    <button onClick={() => startEdit(viewAg)}
                      className="flex-1 py-2.5 rounded-xl border border-brand-200 text-brand-600 text-xs font-bold cursor-pointer hover:bg-brand-50 transition-colors">
                      ✎ Edit
                    </button>
                    <button onClick={() => printAgreement(viewAg)}
                      className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5">
                      ⬇ Download PDF
                    </button>
                    {viewAg.status === "active" && (
                      <button onClick={() => handleTerminate(viewAg.id)} disabled={terminating}
                        className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-60">
                        {terminating ? "..." : "Terminate"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
