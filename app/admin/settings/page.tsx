"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSociety, updateSocietyDetails, type AdminSociety } from "@/lib/admin-data";
import toast from "react-hot-toast";

export default function AdminSettings() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", maintenance_amount: "" });

  useEffect(() => {
    if (!user?.email) return;
    async function load() {
      const s = await getAdminSociety(user!.email);
      setSociety(s);
      if (s) {
        setForm({
          name: s.name ?? "",
          city: s.city ?? "",
          address: s.address ?? "",
          maintenance_amount: s.maintenance_amount ? String(s.maintenance_amount) : "",
        });
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!society?.id) return;
    setSaving(true);
    try {
      await updateSocietyDetails(society.id, {
        name: form.name,
        city: form.city,
        address: form.address,
        maintenance_amount: form.maintenance_amount ? Number(form.maintenance_amount) : undefined,
      });
      setSociety((prev) => prev ? { ...prev, ...form, maintenance_amount: Number(form.maintenance_amount) } : prev);
      setEditing(false);
      toast.success("Society details updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const STATIC_SETTINGS = [
    { label: "Bank Account", desc: "Bank details for maintenance collection", icon: "🏦" },
    { label: "Razorpay Integration", desc: "Payment gateway for online collection", icon: "💳" },
    { label: "WhatsApp API", desc: "Meta Business API for notifications", icon: "📱" },
    { label: "Subscription Plan", desc: `Current: ${(society?.plan ?? society?.subscription_plan)?.toUpperCase() ?? "—"}`, icon: "🔑" },
  ];

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">⚙️ Society Settings</h2>

      {/* Society Profile */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">🏢</span>
            <div>
              <div className="text-sm font-bold text-ink">Society Profile</div>
              <div className="text-[11px] text-ink-muted">Name, address, registration details</div>
            </div>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-2.5 mt-2">
            <div>
              <label className="text-[11px] font-semibold text-ink-muted block mb-1">Society Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink-muted block mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink-muted block mb-1">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink-muted block mb-1">Monthly Maintenance Amount (₹)</label>
              <input
                type="number"
                value={form.maintenance_amount}
                onChange={(e) => setForm((f) => ({ ...f, maintenance_amount: e.target.value }))}
                className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 mt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted text-xs">Name</span>
              <span className="text-ink font-semibold text-xs">{society?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted text-xs">City</span>
              <span className="text-ink font-semibold text-xs">{society?.city ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted text-xs">Address</span>
              <span className="text-ink font-semibold text-xs">{society?.address ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted text-xs">Maintenance</span>
              <span className="text-ink font-semibold text-xs">
                {society?.maintenance_amount ? `₹${society.maintenance_amount}/mo` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Settings */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors">
        <span className="text-[22px]">💰</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-ink">Maintenance Settings</div>
          <div className="text-[11px] text-ink-muted">
            {society?.maintenance_amount ? `₹${society.maintenance_amount}/month` : "Amount, frequency, due date, late fees"}
          </div>
        </div>
        <span className="text-ink-muted">→</span>
      </div>

      {STATIC_SETTINGS.map((s) => (
        <div key={s.label} className="bg-white rounded-[14px] p-4 border border-border-default mb-2 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors">
          <span className="text-[22px]">{s.icon}</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-ink">{s.label}</div>
            <div className="text-[11px] text-ink-muted">{s.desc}</div>
          </div>
          <span className="text-ink-muted">→</span>
        </div>
      ))}
    </div>
  );
}
