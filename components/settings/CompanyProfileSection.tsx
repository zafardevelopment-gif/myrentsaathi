"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";

/** Company / GST profile — biller legal name, GSTIN, PAN, state code, address.
 *  The GSTIN here is snapshotted onto every invoice (shown on the bill). */
export default function CompanyProfileSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ legal_name: "", gst_number: "", pan_number: "", state_code: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/billing/profile?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    if (data.profile) setF({
      legal_name: data.profile.legal_name ?? user.name ?? "",
      gst_number: data.profile.gst_number ?? "",
      pan_number: data.profile.pan_number ?? "",
      state_code: data.profile.state_code ?? "",
      address: data.profile.address ?? "",
    });
    else setF((p) => ({ ...p, legal_name: user.name ?? "" }));
  }, [user]);

  useEffect(() => { if (open && user) load(); }, [open, user, load]);

  const save = async () => {
    if (!user) return;
    if (!f.legal_name.trim()) { setMsg("Legal name is required"); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/billing/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: { id: user.id, role: user.role }, ...f }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved ✓" : "Could not save");
  };

  const inp = "w-full rounded-lg border border-border-default bg-warm-50 px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-brand-500";
  const lbl = "text-[10px] font-semibold text-ink-muted block mb-1";

  return (
    <div className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden">
      <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors" onClick={() => setOpen(!open)}>
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">🏢</div>
        <div className="flex-1">
          <div className="text-sm font-bold text-ink">Company &amp; GST Profile</div>
          <div className="text-[11px] text-ink-muted">Your GSTIN &amp; legal name shown on every invoice</div>
        </div>
        <span className="text-ink-muted text-sm">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-2">
          <div><label className={lbl}>Legal / Business Name *</label><input autoComplete="off" className={inp} value={f.legal_name} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>GSTIN</label><input autoComplete="off" className={`${inp} uppercase`} maxLength={15} placeholder="27ABCDE1234F1Z5" value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value.toUpperCase() })} /></div>
            <div><label className={lbl}>State code (GST)</label><input autoComplete="off" className={inp} maxLength={2} placeholder="27" value={f.state_code} onChange={(e) => setF({ ...f, state_code: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>PAN</label><input autoComplete="off" className={`${inp} uppercase`} maxLength={10} placeholder="ABCDE1234F" value={f.pan_number} onChange={(e) => setF({ ...f, pan_number: e.target.value.toUpperCase() })} /></div>
            <div><label className={lbl}>Address</label><input autoComplete="off" className={inp} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          </div>
          <button onClick={save} disabled={saving} className="mt-1 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60 hover:bg-brand-600">
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {msg && <span className="ml-2 text-[11px] font-semibold text-green-600">{msg}</span>}
        </div>
      )}
    </div>
  );
}
