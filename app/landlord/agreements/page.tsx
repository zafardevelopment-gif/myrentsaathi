"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordAgreements, getLandlordFlats, getLandlordUserId, type LandlordAgreement, type LandlordFlat } from "@/lib/landlord-data";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

const STATUS_BADGE: Record<string, string> = {
  active:  "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  terminated: "bg-red-100 text-red-700",
};

const TIERS = [
  { value: "free", label: "Free Draft" },
  { value: "lawyer_verified", label: "Lawyer Verified (₹499)" },
  { value: "registered", label: "Registered (₹999)" },
];

export default function LandlordAgreements() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<LandlordAgreement[]>([]);
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewAg, setViewAg] = useState<LandlordAgreement | null>(null);

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

  // When flat selected, auto-fill rent/deposit from flat
  function onFlatChange(flatId: string) {
    const flat = flats.find(f => f.id === flatId);
    const tenantUserId = flat?.current_tenant_id ?? "";
    setForm(f => ({
      ...f,
      flat_id: flatId,
      tenant_user_id: tenantUserId,
      monthly_rent: flat?.monthly_rent ? String(flat.monthly_rent) : f.monthly_rent,
      security_deposit: flat?.security_deposit ? String(flat.security_deposit) : f.security_deposit,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!landlordId || !form.flat_id) return;
    const selectedFlat = flats.find(f => f.id === form.flat_id);
    setSaving(true);

    // Get tenant record id (not user_id)
    let tenantRecordId: string | null = null;
    if (form.flat_id) {
      const { data: tenantRec } = await supabase
        .from("tenants")
        .select("id")
        .eq("flat_id", form.flat_id)
        .eq("status", "active")
        .maybeSingle();
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
    setForm({ flat_id: "", tenant_user_id: "", tier: "standard", start_date: "", end_date: "", monthly_rent: "", security_deposit: "" });
    setShowForm(false);
    setLoading(true);
    await loadData();
  }

  async function handleTerminate(agId: string) {
    await supabase.from("agreements").update({ status: "terminated" }).eq("id", agId);
    toast.success("Agreement terminated.");
    setViewAg(null);
    setLoading(true);
    await loadData();
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
  const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";
  const occupiedFlats = flats.filter(f => f.current_tenant_id);

  return (
    <div>
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">📄 Rental Agreements</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
          {showForm ? "Cancel" : "+ Generate"}
        </button>
      </div>

      {/* Generate Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[14px] p-4 border border-brand-200 mb-5 space-y-3">
          <div className="text-sm font-bold text-ink mb-1">📝 New Rental Agreement</div>

          <div>
            <label className={labelClass}>Select Flat *</label>
            <select required className={inputClass} value={form.flat_id} onChange={e => onFlatChange(e.target.value)}>
              <option value="">— Select Flat —</option>
              {flats.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flat_number}{f.block ? ` (${f.block})` : ""} — {f.flat_type ?? ""} {f.current_tenant_id ? "🟢 Occupied" : "⚪ Vacant"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Agreement Type</label>
            <select className={inputClass} value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
              {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Start Date *</label><input required type="date" className={inputClass} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className={labelClass}>End Date *</label><input required type="date" className={inputClass} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Monthly Rent (₹) *</label><input required type="number" className={inputClass} placeholder="25000" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
            <div><label className={labelClass}>Security Deposit (₹)</label><input type="number" className={inputClass} placeholder="50000" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
          </div>

          {occupiedFlats.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-[11px] text-yellow-700">
              No occupied flats — add a tenant first to create an agreement for them.
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {saving ? "Creating..." : "Create Agreement"}
          </button>
        </form>
      )}

      {agreements.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">No agreements found. Create one above.</div>
      ) : (
        agreements.map((ag) => {
          const flat = ag.flat as { flat_number: string; block: string | null } | null;
          const society = ag.society as { name: string; city: string } | null;
          const flatLabel = flat ? `Flat ${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—";
          const daysLeft = ag.end_date ? Math.ceil((new Date(ag.end_date).getTime() - Date.now()) / 86400000) : null;

          return (
            <div key={ag.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-xl flex-shrink-0">📄</div>
                  <div>
                    <div className="text-sm font-bold text-ink">{flatLabel}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {ag.start_date ? new Date(ag.start_date).toLocaleDateString("en-IN") : "?"} –{" "}
                      {ag.end_date ? new Date(ag.end_date).toLocaleDateString("en-IN") : "?"} · {formatCurrency(ag.monthly_rent)}/mo
                    </div>
                    {society && <div className="text-[10px] text-ink-muted">{society.name}, {society.city}</div>}
                    {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                      <div className="text-[10px] text-orange-600 font-bold mt-0.5">⚠️ Expires in {daysLeft} days</div>
                    )}
                    {daysLeft !== null && daysLeft <= 0 && ag.status === "active" && (
                      <div className="text-[10px] text-red-600 font-bold mt-0.5">🔴 Lease expired</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold capitalize ${STATUS_BADGE[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {ag.status}
                  </span>
                  <button onClick={() => setViewAg(ag)} className="px-3 py-1.5 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted cursor-pointer">View</button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* View Agreement Modal */}
      {viewAg && (() => {
        const flat = viewAg.flat as { flat_number: string; block: string | null } | null;
        const society = viewAg.society as { name: string; city: string } | null;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setViewAg(null)}>
            <div className="bg-white rounded-[18px] w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="text-base font-extrabold text-ink">📄 Agreement Details</div>
                <button onClick={() => setViewAg(null)} className="text-ink-muted text-lg cursor-pointer">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Flat", value: flat ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—" },
                  { label: "Society", value: society?.name ?? "Independent" },
                  { label: "Start Date", value: viewAg.start_date ? new Date(viewAg.start_date).toLocaleDateString("en-IN") : "—" },
                  { label: "End Date", value: viewAg.end_date ? new Date(viewAg.end_date).toLocaleDateString("en-IN") : "—" },
                  { label: "Monthly Rent", value: formatCurrency(viewAg.monthly_rent) },
                  { label: "Security Deposit", value: formatCurrency(viewAg.security_deposit ?? 0) },
                  { label: "Type", value: viewAg.tier ?? "Standard" },
                  { label: "Status", value: viewAg.status },
                ].map(d => (
                  <div key={d.label} className="bg-warm-50 rounded-xl p-2.5">
                    <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
                    <div className="text-sm font-bold text-ink mt-0.5 capitalize">{d.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setViewAg(null)} className="flex-1 py-2.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Close</button>
                {viewAg.status === "active" && (
                  <button onClick={() => handleTerminate(viewAg.id)} className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold cursor-pointer">
                    Terminate
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
