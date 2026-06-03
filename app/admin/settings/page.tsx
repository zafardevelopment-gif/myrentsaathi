"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getAdminSociety, updateSocietyDetails, type AdminSociety } from "@/lib/admin-data";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import BankAccountForm from "@/components/settings/BankAccountForm";

export default function AdminSettings() {
  const { user } = useAuth();
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSplit, setSavingSplit] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", maintenance_amount: "", payment_due_day: "" });
  const [splitMode, setSplitMode] = useState<"total_flats" | "active_flats">("total_flats");
  const [openPanel, setOpenPanel] = useState<string | null>(null);

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
          payment_due_day: s.payment_due_day ? String(s.payment_due_day) : "",
        });
        setSplitMode(s.expense_split_mode === "active_flats" ? "active_flats" : "total_flats");
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  // Deep-link: /admin/settings?section=bank → open that section and scroll to it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = new URLSearchParams(window.location.search).get("section");
    if (!section) return;
    setOpenPanel(section);
    setTimeout(() => document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }, []);

  async function handleSave() {
    if (!society?.id) return;
    setSaving(true);
    try {
      await updateSocietyDetails(society.id, {
        name: form.name,
        city: form.city,
        address: form.address,
        maintenance_amount: form.maintenance_amount ? Number(form.maintenance_amount) : undefined,
        payment_due_day: form.payment_due_day ? Number(form.payment_due_day) : undefined,
      });
      setSociety((prev) => prev ? {
        ...prev, ...form,
        maintenance_amount: Number(form.maintenance_amount),
        payment_due_day: form.payment_due_day ? Number(form.payment_due_day) : null,
      } : prev);
      setEditing(false);
      toast.success("Society details updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSplit(mode: "total_flats" | "active_flats") {
    if (!society?.id) return;
    setSplitMode(mode);
    setSavingSplit(true);
    try {
      await updateSocietyDetails(society.id, { expense_split_mode: mode });
      setSociety((prev) => prev ? { ...prev, expense_split_mode: mode } : prev);
      toast.success("Expense split mode updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingSplit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const INTEGRATION_CARDS = [
    {
      key: "bank",
      label: "Bank Account",
      desc: "Rent & maintenance is deposited directly into your account",
      icon: "🏦",
    },
    {
      key: "whatsapp",
      label: "WhatsApp Notifications",
      desc: "Tenant alerts are sent from your number",
      icon: "📱",
    },
  ];

  return (
    <div>
      <Toaster position="top-center" />
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
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">
              Edit
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl bg-warm-100 text-ink text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-2.5 mt-2">
            {[
              { label: "Society Name", key: "name", type: "text" },
              { label: "City", key: "city", type: "text" },
              { label: "Address", key: "address", type: "text" },
              { label: "Monthly Maintenance Amount (₹)", key: "maintenance_amount", type: "number" },
              { label: "Payment Due Day (1–28)", key: "payment_due_day", type: "number" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-[11px] font-semibold text-ink-muted block mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full border border-border-default rounded-xl px-3 py-2 text-sm text-ink bg-warm-50 focus:outline-none focus:border-brand-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {[
              { label: "Name", value: society?.name },
              { label: "City", value: society?.city },
              { label: "Address", value: society?.address },
              { label: "Maintenance", value: society?.maintenance_amount ? `₹${society.maintenance_amount}/mo` : null },
              { label: "Payment Due Day", value: society?.payment_due_day ? `${society.payment_due_day}th of every month` : null },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-ink-muted text-xs">{row.label}</span>
                <span className="text-ink font-semibold text-xs">{row.value ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Split Mode */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[22px]">🔢</span>
          <div>
            <div className="text-sm font-bold text-ink">Expense Split Mode</div>
            <div className="text-[11px] text-ink-muted">How society expenses are divided per flat</div>
          </div>
        </div>
        <div className="flex gap-2">
          {([
            { mode: "total_flats", label: "🏢 Total Flats", sub: `From society profile (${society?.total_flats ?? "—"} flats)` },
            { mode: "active_flats", label: "✅ Active Flats", sub: "Only flats in system" },
          ] as const).map(({ mode, label, sub }) => (
            <button
              key={mode}
              onClick={() => handleSaveSplit(mode)}
              disabled={savingSplit}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-60 ${
                splitMode === mode ? "bg-brand-500 text-white border-brand-500" : "bg-warm-50 text-ink-muted border-border-default hover:border-brand-400"
              }`}
            >
              {label}
              <div className={`text-[10px] font-normal mt-0.5 ${splitMode === mode ? "text-white/80" : "text-ink-muted"}`}>{sub}</div>
            </button>
          ))}
        </div>
        <div className="text-[10px] text-ink-muted mt-2">
          {splitMode === "total_flats"
            ? "Each landlord pays: Total Expense ÷ Total Flats in society profile"
            : "Each landlord pays: Total Expense ÷ Flats currently added in system"}
        </div>
      </div>

      {/* Integration Cards */}
      {INTEGRATION_CARDS.map((card) => (
        <div key={card.key} id={`settings-${card.key}`} className="bg-white rounded-[14px] border border-border-default mb-2 overflow-hidden scroll-mt-20">
          <div
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-warm-50 transition-colors"
            onClick={() => setOpenPanel(openPanel === card.key ? null : card.key)}
          >
            <span className="text-[22px]">{card.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-ink">{card.label}</div>
              <div className="text-[11px] text-ink-muted">{card.desc}</div>
            </div>
            <span className="text-ink-muted text-sm">{openPanel === card.key ? "▲" : "▼"}</span>
          </div>

          {openPanel === card.key && (
            <div className="px-4 pb-4 border-t border-border-light pt-3">
              {card.key === "bank" && society?.id && user?.id && (
                <BankAccountForm
                  entityType="society"
                  entityId={society.id}
                  userId={user.id}
                />
              )}
              {card.key === "whatsapp" && (
                <div className="py-2 text-[11px] text-ink-muted">
                  WhatsApp notifications are configured at the platform level. Contact the Super Admin for a custom number.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <SubscriptionSection planType="society" />
    </div>
  );
}
