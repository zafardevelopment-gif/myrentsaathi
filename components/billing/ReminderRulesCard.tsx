"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import toast from "react-hot-toast";

type ReminderRule = {
  id: string;
  invoice_type: string;
  days_before: number[];
  on_due_date: boolean;
  days_after: number[];
  repeat_after_days: number | null;
  channels: string[];
  is_active: boolean;
};

const REPEAT_OPTIONS = [
  { value: "", label: "Off — don't repeat" },
  { value: "1", label: "Daily until paid" },
  { value: "7", label: "Weekly until paid" },
];

/**
 * Landlord/society "rent reminder" settings — when to nudge tenants before
 * the due date, and whether to keep nudging automatically after it until
 * the invoice is paid. Backed by /api/billing/reminder-rules + the daily
 * process-reminders cron (lib/billing/reminder-service.ts).
 */
export default function ReminderRulesCard() {
  const { user, hydrated } = useAuth();
  const [rule, setRule] = useState<ReminderRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [daysBefore, setDaysBefore] = useState("7");
  const [onDueDate, setOnDueDate] = useState(true);
  const [repeatAfter, setRepeatAfter] = useState("1");
  const [whatsapp, setWhatsapp] = useState(true);
  const [email, setEmail] = useState(true);
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/reminder-rules?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      const existing: ReminderRule | undefined = (data.rules ?? []).find((r: ReminderRule) => r.invoice_type === "all") ?? data.rules?.[0];
      if (existing) {
        setRule(existing);
        setDaysBefore(existing.days_before?.[0] != null ? String(existing.days_before[0]) : "");
        setOnDueDate(existing.on_due_date);
        setRepeatAfter(existing.repeat_after_days ? String(existing.repeat_after_days) : "");
        setWhatsapp(existing.channels?.includes("whatsapp") ?? false);
        setEmail(existing.channels?.includes("email") ?? false);
        setActive(existing.is_active);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (hydrated && user) load(); }, [hydrated, user, load]);

  const save = async () => {
    if (!user) return;
    const channels = [whatsapp && "whatsapp", email && "email"].filter(Boolean) as string[];
    if (channels.length === 0) { toast.error("Pick at least one channel (WhatsApp or email)."); return; }

    setSaving(true);
    try {
      const payload = {
        user: { id: user.id, role: user.role },
        invoice_type: "all",
        days_before: daysBefore ? [Number(daysBefore)] : [],
        on_due_date: onDueDate,
        days_after: rule?.days_after ?? [],
        repeat_after_days: repeatAfter ? Number(repeatAfter) : null,
        channels,
        is_active: active,
      };
      const res = await fetch("/api/billing/reminder-rules", {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule ? { ...payload, id: rule.id } : payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save reminder settings."); return; }
      toast.success("Reminder settings saved.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-[14px] border border-border-default bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">Rent Reminders</h3>
        <label className="flex items-center gap-2 text-xs font-bold text-ink-muted cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Active
        </label>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Automatically remind tenants before rent is due, and keep reminding them after the due date until they pay.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-ink mb-1">Remind before due date</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={30} value={daysBefore}
              onChange={(e) => setDaysBefore(e.target.value)}
              className="w-20 rounded-lg border border-border-default px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-ink-muted">days before due date (e.g. 7 = one week before)</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">On the due date</label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={onDueDate} onChange={(e) => setOnDueDate(e.target.checked)} className="h-4 w-4" />
            Also send a reminder on the due date itself
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">After due date, if still unpaid</label>
          <select
            value={repeatAfter} onChange={(e) => setRepeatAfter(e.target.value)}
            className="w-full rounded-lg border border-border-default px-2 py-1.5 text-sm bg-white"
          >
            {REPEAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">Stops automatically as soon as the invoice is marked paid.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1">Send via</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="h-4 w-4" />
              WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4" />
              Email
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={save} disabled={saving}
        className="mt-4 rounded-xl bg-brand-500 text-white text-sm font-bold px-4 py-2 disabled:opacity-60 cursor-pointer"
      >
        {saving ? "Saving…" : rule ? "Update reminder settings" : "Turn on reminders"}
      </button>
    </div>
  );
}
