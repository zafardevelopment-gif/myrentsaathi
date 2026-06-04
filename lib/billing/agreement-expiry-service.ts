/**
 * Agreement expiry reminder service.
 * Sends email to tenant (and landlord) when agreement is expiring in 30/15/7 days.
 */

import { supabaseAdmin } from "../supabase-admin";
import { emailAgreementExpiring } from "../email";

const REMINDER_DAYS = [30, 15, 7];

export async function checkAgreementExpiry(today?: string): Promise<{ sent: number; errors: number }> {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  let sent = 0;
  let errors = 0;

  for (const daysLeft of REMINDER_DAYS) {
    const targetDate = new Date(new Date(todayStr + "T00:00:00Z").getTime() + daysLeft * 86_400_000)
      .toISOString().slice(0, 10);

    // Find all active agreements expiring on targetDate
    const { data: agreements } = await supabaseAdmin
      .from("agreements")
      .select(`
        id, end_date, monthly_rent,
        flat:flats(flat_number, block, owner_id),
        tenant:tenants(id, user_id)
      `)
      .eq("status", "active")
      .eq("end_date", targetDate);

    for (const ag of agreements ?? []) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flat = Array.isArray(ag.flat) ? ag.flat[0] : ag.flat as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = Array.isArray(ag.tenant) ? ag.tenant[0] : ag.tenant as any;
        if (!flat || !tenant) continue;

        const flatNumber = `${flat.flat_number}${flat.block ? ` (${flat.block})` : ""}`;

        // Get tenant user info
        const { data: tenantUser } = tenant?.user_id
          ? await supabaseAdmin.from("users").select("email, full_name").eq("id", tenant.user_id).maybeSingle()
          : { data: null };

        // Get landlord info
        const { data: landlordUser } = flat?.owner_id
          ? await supabaseAdmin.from("users").select("email, full_name").eq("id", flat.owner_id).maybeSingle()
          : { data: null };

        const landlordName = landlordUser?.full_name ?? "Your Landlord";
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com"}/tenant/profile`;

        // Send to tenant
        if (tenantUser?.email) {
          await emailAgreementExpiring({
            to: tenantUser.email,
            tenantName: tenantUser.full_name ?? "Tenant",
            flatNumber,
            endDate: ag.end_date,
            daysLeft,
            landlordName,
            dashboardUrl,
          });
          sent++;
        }

        // Send to landlord (different message framing — they need to take action)
        if (landlordUser?.email) {
          const tenantName = tenantUser?.full_name ?? "Tenant";
          const { sendEmail } = await import("../email") as { sendEmail?: (p: { to: string; subject: string; html: string }) => Promise<void> };
          // Use the raw sendEmail — landlord gets a slightly different email
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com";
          const url = `${APP_URL}/api/email/send`;
          await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: landlordUser.email,
              subject: `Agreement Expiring — Flat ${flatNumber} (${daysLeft} days left)`,
              html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
                <div style="background:#1a1a2e;border-radius:10px;padding:16px 24px;margin-bottom:20px">
                  <h2 style="color:#fff;margin:0;font-size:16px">MyRentSaathi</h2>
                </div>
                <p style="color:#333;font-size:14px">Namaste <strong>${landlordUser.full_name ?? "Landlord"}</strong>,</p>
                <p style="color:#555;font-size:13px">Flat <strong>${flatNumber}</strong> ka rent agreement <strong style="color:#c2660a">${daysLeft} din</strong> mein expire ho raha hai.</p>
                <div style="background:#fff8f0;border:1px solid #fcd9b0;border-radius:8px;padding:14px;margin:14px 0;font-size:13px">
                  <div style="margin-bottom:6px"><span style="color:#888">Tenant:</span> <strong>${tenantName}</strong></div>
                  <div style="margin-bottom:6px"><span style="color:#888">Flat:</span> <strong>${flatNumber}</strong></div>
                  <div style="margin-bottom:6px"><span style="color:#888">Expiry Date:</span> <strong style="color:#c2660a">${ag.end_date}</strong></div>
                  <div><span style="color:#888">Days Left:</span> <strong style="color:#c2660a">${daysLeft} days</strong></div>
                </div>
                <a href="${APP_URL}/landlord/agreements" style="display:inline-block;background:#c2660a;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;font-size:13px">Agreements Dekhen →</a>
                <p style="color:#aaa;font-size:11px;margin-top:16px">MyRentSaathi · myrentsaathi.com</p>
              </div>`,
            }),
          }).catch(() => {});
          sent++;
        }
      } catch {
        errors++;
      }
    }
  }

  return { sent, errors };
}
