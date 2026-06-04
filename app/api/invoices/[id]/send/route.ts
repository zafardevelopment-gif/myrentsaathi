import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getInvoiceDetail } from "@/lib/billing/invoice-service";
import { generateInvoicePdf } from "@/lib/billing/invoice-pdf";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
type Ctx = { params: Promise<{ id: string }> };

// POST /api/invoices/[id]/send — email the invoice to the recipient.
// Embeds the full invoice as email body + "Print as PDF" instructions.
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const detail = await getInvoiceDetail(id);
    if (!detail) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const inv = detail.invoice as Record<string, unknown>;

    const recipientId = inv.recipient_user_id as string | null;
    if (!recipientId) return NextResponse.json({ error: "Invoice has no recipient" }, { status: 400 });
    const { data: user } = await supabaseAdmin.from("users").select("email, full_name").eq("id", recipientId).maybeSingle();
    if (!user?.email) return NextResponse.json({ error: "Recipient has no email" }, { status: 400 });

    let billerName: string | null = null;
    if (inv.society_id) {
      const { data: s } = await supabaseAdmin.from("societies").select("name").eq("id", inv.society_id as string).maybeSingle();
      billerName = s?.name ?? null;
    } else if (inv.landlord_id) {
      const { data: l } = await supabaseAdmin.from("users").select("full_name").eq("id", inv.landlord_id as string).maybeSingle();
      billerName = l?.full_name ?? null;
    }


    const invoiceNumber = esc(String(inv.invoice_number ?? ""));
    const viewUrl = `${APP_URL}/api/invoices/${inv.id}/pdf`;
    const payUrl = `${APP_URL}/api/payment/redirect?invoice=${inv.id}`;
    const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
    const isPaid = inv.status === "paid";

    // Build line items table rows for email
    const lineRows = detail.lines.map((l: { description: string; line_total: number; gst_amount: number }) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece6;font-size:13px;color:#333">${esc(l.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece6;font-size:13px;color:#333;text-align:right">₹${Number(l.line_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>`).join("");

    const emailBody = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%">

      <!-- Header -->
      <tr><td style="background:#1a1a2e;padding:20px 28px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#fff;font-size:20px;font-weight:900">🏠 MyRent<span style="color:#c2660a">Saathi</span></td>
            <td align="right" style="color:#aaa;font-size:12px">Tax Invoice</td>
          </tr>
        </table>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:24px 28px 0">
        <p style="margin:0;font-size:15px;color:#222">Dear <strong>${esc(user.full_name ?? "Tenant")}</strong>,</p>
        <p style="margin:8px 0 0;font-size:14px;color:#555">Your invoice has been generated. Please review the details below.</p>
      </td></tr>

      <!-- Invoice meta -->
      <tr><td style="padding:16px 28px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border-radius:8px;border:1px solid #ede8df">
          <tr>
            <td style="padding:12px 16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Invoice No.</td>
            <td style="padding:12px 16px;font-size:13px;color:#222;font-weight:700;font-family:monospace">${invoiceNumber}</td>
            <td style="padding:12px 16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Period</td>
            <td style="padding:12px 16px;font-size:13px;color:#222">${esc(String(inv.billing_period ?? "—"))}</td>
          </tr>
          <tr>
            <td style="padding:0 16px 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Issue Date</td>
            <td style="padding:0 16px 12px;font-size:13px;color:#222">${esc(String(inv.issue_date ?? ""))}</td>
            <td style="padding:0 16px 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Due Date</td>
            <td style="padding:0 16px 12px;font-size:13px;color:#c2660a;font-weight:700">${esc(String(inv.due_date ?? "—"))}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Line items -->
      <tr><td style="padding:0 28px">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8df;border-radius:8px;overflow:hidden">
          <tr style="background:#c2660a">
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:700;text-transform:uppercase">Description</th>
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:right;font-weight:700;text-transform:uppercase">Amount</th>
          </tr>
          ${lineRows}
          <tr style="background:#faf7f2">
            <td style="padding:10px 12px;font-size:13px;color:#555">Sub Total</td>
            <td style="padding:10px 12px;font-size:13px;color:#333;text-align:right">₹${Number(inv.sub_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
          ${Number(inv.cgst_total) > 0 ? `
          <tr style="background:#faf7f2">
            <td style="padding:4px 12px;font-size:12px;color:#888">CGST</td>
            <td style="padding:4px 12px;font-size:12px;color:#888;text-align:right">₹${Number(inv.cgst_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#faf7f2">
            <td style="padding:4px 12px 10px;font-size:12px;color:#888">SGST</td>
            <td style="padding:4px 12px 10px;font-size:12px;color:#888;text-align:right">₹${Number(inv.sgst_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>` : ""}
          <tr style="background:#fff3e8">
            <td style="padding:12px;font-size:15px;font-weight:900;color:#c2660a">Total</td>
            <td style="padding:12px;font-size:15px;font-weight:900;color:#c2660a;text-align:right">₹${Number(inv.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Outstanding -->
      ${!isPaid ? `
      <tr><td style="padding:16px 28px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #fcd9b0;border-radius:8px">
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#92400e;font-weight:700">Outstanding Amount</td>
            <td style="padding:12px 16px;font-size:18px;color:#c2660a;font-weight:900;text-align:right">₹${outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </td></tr>` : ""}

      <!-- Buttons -->
      <tr><td style="padding:24px 28px" align="center">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:12px">
              <a href="${viewUrl}" style="display:inline-block;background:#c2660a;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Invoice →</a>
            </td>
            ${!isPaid ? `<td>
              <a href="${payUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Pay Now →</a>
            </td>` : ""}
          </tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 28px;border-top:1px solid #f0ece6;text-align:center">
        <p style="margin:0;font-size:11px;color:#aaa">This is an automated email from MyRentSaathi. Please do not reply.</p>
        <p style="margin:4px 0 0;font-size:11px;color:#aaa">© MyRentSaathi · myrentsaathi.com</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

    // Generate PDF attachment
    let pdfAttachment: { filename: string; content: string; encoding: string; contentType: string } | null = null;
    try {
      const pdfBuffer = await generateInvoicePdf(inv, detail.lines, billerName, user.full_name);
      pdfAttachment = {
        filename: `${String(inv.invoice_number ?? "invoice")}.pdf`,
        content: pdfBuffer.toString("base64"),
        encoding: "base64",
        contentType: "application/pdf",
      };
    } catch (pdfErr) {
      console.error("[send invoice] PDF generation failed, sending without attachment:", pdfErr);
    }

    const res = await fetch(`${APP_URL}/api/email/send`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.email,
        subject: `Invoice ${inv.invoice_number} — MyRentSaathi`,
        html: emailBody,
        ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[send invoice email]", res.status, errBody);
      return NextResponse.json({ error: "Email send failed" }, { status: 502 });
    }
    return NextResponse.json({ success: true, to: user.email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
