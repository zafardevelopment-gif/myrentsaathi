/**
 * Reminder materialisation + queue drain (§10). Idempotent: the
 * notification_queue unique index prevents duplicate sends per
 * (invoice, template, channel, day). Sends reuse the app's existing
 * /api/email/send and /api/whatsapp/send routes.
 */

import { supabaseAdmin } from "../supabase-admin";
import { enumerateBillerScopes } from "./cron-service";
import { scopeColumn, type BillerScope } from "./scope";
import { formatINR } from "./money";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + days * 86_400_000).toISOString().slice(0, 10);
}
function monthEnd(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

type Rule = {
  invoice_type: string; days_before: number[]; on_due_date: boolean;
  days_after: number[]; month_end_followup: boolean; channels: string[];
};

/** Create due reminder queue rows for all configured billers, for `today`. */
async function materialize(scope: BillerScope, today: string): Promise<number> {
  const { column, value } = scopeColumn(scope);
  const { data: rules } = await supabaseAdmin
    .from("reminder_rules").select("*").eq(column, value).eq("is_active", true);
  if (!rules?.length) return 0;

  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_type, due_date, recipient_user_id, total_amount, amount_paid, invoice_number")
    .eq(column, value)
    .in("status", ["unpaid", "partially_paid", "overdue"])
    .not("due_date", "is", null)
    .not("recipient_user_id", "is", null);

  let queued = 0;
  for (const inv of invoices ?? []) {
    const matching = (rules as Rule[]).filter((r) => r.invoice_type === "all" || r.invoice_type === inv.invoice_type);
    for (const rule of matching) {
      const triggers: { template: string }[] = [];
      if (rule.days_before?.some((d) => addDays(inv.due_date, -d) === today)) triggers.push({ template: "reminder_before" });
      if (rule.on_due_date && inv.due_date === today) triggers.push({ template: "reminder_due" });
      if (rule.days_after?.some((d) => addDays(inv.due_date, d) === today)) triggers.push({ template: "reminder_after" });
      if (rule.month_end_followup && monthEnd(today) === today) triggers.push({ template: "month_end" });

      for (const t of triggers) {
        for (const channel of rule.channels) {
          const { error } = await supabaseAdmin.from("notification_queue").insert({
            channel, template: t.template, recipient_user_id: inv.recipient_user_id, invoice_id: inv.id,
            payload: {
              invoice_number: inv.invoice_number,
              outstanding: Number(inv.total_amount) - Number(inv.amount_paid),
              due_date: inv.due_date, invoice_type: inv.invoice_type,
            },
            scheduled_for: new Date().toISOString(),
          });
          if (!error) queued++; // dupe (unique index) → silently skipped
        }
      }
    }
  }
  return queued;
}

/** Send pending queue rows whose time has come. */
async function drain(): Promise<{ sent: number; failed: number }> {
  const { data: rows } = await supabaseAdmin
    .from("notification_queue").select("*").eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString()).limit(200);
  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      const { data: user } = await supabaseAdmin
        .from("users").select("full_name, email, phone").eq("id", row.recipient_user_id).maybeSingle();
      const outstanding = formatINR(Number(row.payload?.outstanding ?? 0));
      const label: Record<string, string> = {
        reminder_before: "Payment reminder", reminder_due: "Payment due today",
        reminder_after: "Overdue payment", month_end: "Month-end payment follow-up", invoice_generated: "New invoice",
      };
      const subject = `${label[row.template] ?? "Payment reminder"} — ${row.payload?.invoice_number ?? ""}`.trim();

      let ok = false;
      if (row.channel === "email" && user?.email) {
        const html = `<p>Namaste ${user.full_name ?? ""},</p>
          <p>${label[row.template] ?? "Payment reminder"} for invoice <b>${row.payload?.invoice_number ?? ""}</b>.</p>
          <p>Outstanding: <b>${outstanding}</b>${row.payload?.due_date ? ` · Due: ${row.payload.due_date}` : ""}</p>`;
        const res = await fetch(`${APP_URL}/api/email/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: user.email, subject, html }),
        });
        ok = res.ok;
      } else if (row.channel === "whatsapp" && user?.phone) {
        // best-effort: reuse generic whatsapp send route
        const res = await fetch(`${APP_URL}/api/whatsapp/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: user.phone, template: "mrs_rent_due", params: [user.full_name ?? "", outstanding] }),
        });
        ok = res.ok;
      } else {
        ok = true; // no destination → treat as resolved to avoid retry storms
      }

      if (ok) {
        await supabaseAdmin.from("notification_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
        sent++;
      } else {
        await supabaseAdmin.from("notification_queue").update({ status: "failed", attempts: (row.attempts ?? 0) + 1, last_error: "send failed" }).eq("id", row.id);
        failed++;
      }
    } catch (e) {
      await supabaseAdmin.from("notification_queue")
        .update({ status: "failed", attempts: (row.attempts ?? 0) + 1, last_error: e instanceof Error ? e.message : String(e) }).eq("id", row.id);
      failed++;
    }
  }
  return { sent, failed };
}

/** Cron entrypoint: materialise today's reminders for every biller, then drain. */
export async function processReminders(asOf?: string): Promise<{ queued: number; sent: number; failed: number }> {
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const scopes = await enumerateBillerScopes();
  let queued = 0;
  for (const scope of scopes) queued += await materialize(scope, today);
  const { sent, failed } = await drain();
  return { queued, sent, failed };
}
