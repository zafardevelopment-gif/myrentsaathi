"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getLandlordFlats, getLandlordUserId, type LandlordFlat } from "@/lib/landlord-data";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

type NocRecord = {
  id: string;
  flat_id: string;
  tenant_name: string | null;
  reason: string;
  generated_at: string;
};

const REASON_LABELS: Record<string, string> = {
  lease_end: "Lease End",
  early_exit: "Early Exit",
  mutual_agreement: "Mutual Agreement",
};

const inputClass = "w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500";
const labelClass = "text-[10px] font-semibold text-ink-muted block mb-1";

export default function NocPage() {
  const { user } = useAuth();
  const [flats, setFlats] = useState<LandlordFlat[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [landlordName, setLandlordName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nocRecords, setNocRecords] = useState<NocRecord[]>([]);
  const [generatedNoc, setGeneratedNoc] = useState<null | {
    tenantName: string;
    flatLabel: string;
    reason: string;
    remarks: string;
    startDate: string;
    endDate: string;
    generatedDate: string;
  }>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    flat_id: "",
    reason: "lease_end",
    remarks: "",
    start_date: "",
    end_date: "",
  });

  const occupiedFlats = flats.filter(f => f.current_tenant_id);
  const selectedFlat = occupiedFlats.find(f => f.id === form.flat_id);

  async function loadData() {
    if (!user?.email) return;
    const [f, lid] = await Promise.all([
      getLandlordFlats(user.email).catch(() => [] as LandlordFlat[]),
      getLandlordUserId(user.email),
    ]);
    setFlats(f);
    setLandlordId(lid);
    setLandlordName(user.name ?? "Landlord");

    if (lid) {
      const { data } = await supabase
        .from("noc_records")
        .select("id, flat_id, tenant_name, reason, generated_at")
        .eq("generated_by", lid)
        .order("generated_at", { ascending: false });
      setNocRecords(data ?? []);
    }
  }

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [user]);

  // Auto-fill agreement dates when flat selected
  useEffect(() => {
    if (!form.flat_id) return;
    (async () => {
      const { data } = await supabase
        .from("agreements")
        .select("start_date, end_date")
        .eq("flat_id", form.flat_id)
        .eq("status", "active")
        .maybeSingle();
      if (data) {
        setForm(f => ({ ...f, start_date: data.start_date ?? "", end_date: data.end_date ?? "" }));
      }
    })();
  }, [form.flat_id]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlat || !landlordId) return;
    setSaving(true);
    const tenantName = selectedFlat.tenant?.user?.full_name ?? "Tenant";
    const flatLabel = `${selectedFlat.flat_number}${selectedFlat.block ? ` (Block ${selectedFlat.block})` : ""}`;
    const { error } = await supabase.from("noc_records").insert({
      flat_id: form.flat_id,
      tenant_user_id: selectedFlat.tenant?.user ? null : null,
      tenant_name: tenantName,
      reason: form.reason,
      remarks: form.remarks || null,
      generated_by: landlordId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setGeneratedNoc({
      tenantName,
      flatLabel,
      reason: form.reason,
      remarks: form.remarks,
      startDate: form.start_date,
      endDate: form.end_date,
      generatedDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    });
    toast.success("NOC generated and saved.");
    await loadData();
  }

  const flatLabel = (f: LandlordFlat) =>
    `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""} — ${f.tenant?.user?.full_name ?? "Tenant"}`;

  const histFlatMap = Object.fromEntries(flats.map(f => [f.id, f]));

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-100 rounded-[14px] animate-pulse" />)}</div>;
  }

  return (
    <div>
      <Toaster position="top-center" />
      <style>{`
        @media print {
          body > * { display: none !important; }
          #noc-print-area { display: block !important; position: fixed; inset: 0; background: white; padding: 40px; }
        }
      `}</style>

      <h2 className="text-[15px] font-extrabold text-ink mb-4">📜 NOC Generator</h2>

      <form onSubmit={handleGenerate} className="bg-white rounded-[14px] p-4 border border-border-default mb-5 space-y-4">
        <div className="text-sm font-bold text-ink">Generate No Objection Certificate</div>

        <div>
          <label className={labelClass}>Select Tenant *</label>
          <select required className={inputClass} value={form.flat_id} onChange={e => setForm(f => ({ ...f, flat_id: e.target.value }))}>
            <option value="">— Choose a flat/tenant —</option>
            {occupiedFlats.map(f => <option key={f.id} value={f.id}>{flatLabel(f)}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Reason for NOC *</label>
          <select className={inputClass} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
            <option value="lease_end">Lease End</option>
            <option value="early_exit">Early Exit</option>
            <option value="mutual_agreement">Mutual Agreement</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tenancy Start</label>
            <input type="date" className={inputClass} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Tenancy End</label>
            <input type="date" className={inputClass} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Remarks (optional)</label>
          <textarea className={inputClass + " resize-none"} rows={2} placeholder="e.g. No dues pending, flat handed over in good condition" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
        </div>

        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
          {saving ? "Generating..." : "Generate NOC"}
        </button>
      </form>

      {/* NOC Preview */}
      {generatedNoc && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold text-ink">NOC Preview</div>
            <button onClick={() => window.print()} className="px-4 py-1.5 rounded-xl bg-ink text-white text-xs font-bold cursor-pointer">
              🖨️ Print / Download
            </button>
          </div>

          <div id="noc-print-area" ref={printRef} className="bg-white border border-border-default rounded-[14px] p-6 text-ink" style={{ fontFamily: "Georgia, serif" }}>
            <div className="text-center mb-6">
              <div className="text-lg font-extrabold uppercase tracking-widest">No Objection Certificate</div>
              <div className="text-xs text-ink-muted mt-1">Date: {generatedNoc.generatedDate}</div>
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-4 space-y-3 text-sm leading-relaxed">
              <p>
                This is to certify that <strong>{generatedNoc.tenantName}</strong> was a tenant at{" "}
                <strong>{generatedNoc.flatLabel}</strong>
                {generatedNoc.startDate && generatedNoc.endDate
                  ? ` from ${new Date(generatedNoc.startDate).toLocaleDateString("en-IN")} to ${new Date(generatedNoc.endDate).toLocaleDateString("en-IN")}`
                  : ""}
                .
              </p>
              <p>
                The tenancy has been concluded by way of{" "}
                <strong>{REASON_LABELS[generatedNoc.reason] ?? generatedNoc.reason}</strong>.
                The landlord has no objection to the tenant vacating the premises.
              </p>
              {generatedNoc.remarks && (
                <p>
                  <strong>Additional Remarks:</strong> {generatedNoc.remarks}
                </p>
              )}
              <p>
                All dues have been cleared and the flat has been handed over to the landlord's satisfaction.
                This certificate is issued in good faith for the tenant's future reference.
              </p>
            </div>

            <div className="mt-8 flex justify-between text-sm">
              <div>
                <div className="font-bold">{landlordName}</div>
                <div className="text-xs text-ink-muted">Landlord / Property Owner</div>
              </div>
              <div className="text-right">
                <div className="border-b border-gray-400 w-36 mb-1">&nbsp;</div>
                <div className="text-xs text-ink-muted">Signature</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {nocRecords.length > 0 && (
        <>
          <h3 className="text-[13px] font-extrabold text-ink mb-3">Past NOCs</h3>
          {nocRecords.map(r => {
            const f = histFlatMap[r.flat_id];
            return (
              <div key={r.id} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-ink">{r.tenant_name ?? "Tenant"}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {f ? `Flat ${f.flat_number}${f.block ? ` (${f.block})` : ""}` : ""}
                    {" · "}{REASON_LABELS[r.reason] ?? r.reason}
                  </div>
                </div>
                <div className="text-[10px] text-ink-muted">{new Date(r.generated_at).toLocaleDateString("en-IN")}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
