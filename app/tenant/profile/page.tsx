"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getTenantProfile, updateTenantGst, type TenantProfile } from "@/lib/tenant-data";

export default function TenantProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [gstValue, setGstValue] = useState("");
  const [gstSaving, setGstSaving] = useState(false);
  const [gstMsg, setGstMsg] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    getTenantProfile(user.email)
      .then((p) => { setProfile(p); setGstValue(p?.gst_number ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function saveGst() {
    if (!profile) return;
    setGstSaving(true); setGstMsg("");
    const res = await updateTenantGst(profile.id, gstValue);
    setGstSaving(false);
    if (!res.success) { setGstMsg("Could not save. " + (res.error ?? "")); return; }
    setGstMsg("Saved ✓");
    setProfile({ ...profile, gst_number: gstValue.trim() || null });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-36 bg-warm-100 rounded-[14px] animate-pulse" />
        <div className="h-48 bg-warm-100 rounded-[14px] animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-6 text-center">
        <div className="text-yellow-700 font-bold">⚠️ Profile not found</div>
      </div>
    );
  }

  const u = profile.user;
  const flat = profile.flat;
  const society = profile.society;
  const owner = flat?.owner;

  const initials = (u?.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const profileDetails = [
    { label: "Phone", value: u?.phone ?? "—" },
    { label: "Email", value: u?.email ?? "—" },
    { label: "Flat", value: flat?.flat_number ? `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}` : "—" },
    { label: "Type", value: flat?.flat_type ?? "—" },
    { label: "Landlord", value: owner?.full_name ?? "—" },
    { label: "Landlord Phone", value: owner?.phone ?? "—" },
    { label: "Society", value: society?.name ?? "—" },
    { label: "City", value: society?.city ?? "—" },
    { label: "Monthly Rent", value: flat?.monthly_rent ? formatCurrency(flat.monthly_rent) : "—" },
    { label: "Move-in Date", value: "—" },
  ];

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">👤 My Profile</h2>

      {/* Avatar card */}
      <div className="bg-white rounded-[14px] p-6 border border-border-default mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-extrabold text-brand-500 mx-auto mb-3">
          {initials}
        </div>
        <div className="text-lg font-extrabold text-ink">{u?.full_name ?? "—"}</div>
        <div className="text-xs text-brand-500 font-semibold mt-0.5">Tenant</div>
        <div className="text-xs text-ink-muted mt-0.5">{u?.email}</div>
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink mb-3">Tenancy Details</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {profileDetails.map((d) => (
            <div key={d.label}>
              <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
              <div className="text-sm font-semibold text-ink mt-0.5 break-words">{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GST Number (optional — for GST invoices) */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink">GST Number <span className="text-[10px] font-normal text-ink-muted">(optional)</span></div>
        <div className="text-[11px] text-ink-muted mt-0.5 mb-3">Add your GSTIN only if you need GST invoices for your rent.</div>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            className="flex-1 min-w-[180px] border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500 uppercase"
            placeholder="e.g. 27ABCDE1234F1Z5"
            value={gstValue}
            maxLength={15}
            onChange={(e) => setGstValue(e.target.value.toUpperCase())}
          />
          <button onClick={saveGst} disabled={gstSaving}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {gstSaving ? "Saving..." : "Save GST"}
          </button>
        </div>
        {gstMsg && <div className="text-[11px] mt-2 font-semibold text-green-600">{gstMsg}</div>}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-2.5 rounded-xl border border-brand-500 text-brand-500 text-xs font-bold cursor-pointer">
          Edit Profile
        </button>
        <button className="flex-1 py-2.5 rounded-xl border border-border-default text-ink-muted text-xs font-bold cursor-pointer">
          Change Password
        </button>
      </div>
    </div>
  );
}
