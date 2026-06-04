/**
 * Branded invoice HTML renderer (§9, §25). Returns a self-contained,
 * print-to-PDF-ready HTML document driven by the template config.
 *
 * NOTE: This is the immediate, dependency-free renderer. The design's
 * production path is @react-pdf/renderer for a true PDF binary; this HTML
 * plugs into the same /api/invoices/[id]/pdf + email-attachment flow and
 * can be swapped for a PDF buffer without changing callers.
 */

import { formatINR } from "./money";

type Line = {
  description: string; hsn_sac: string | null; quantity: number; unit_rate: number; line_total: number;
  gst_percent: number; gst_applicable?: boolean; cgst_amount: number; sgst_amount: number; igst_amount: number; line_kind: string;
};
type Invoice = {
  id: string;
  invoice_number: string; invoice_type: string; issue_date: string; due_date: string | null;
  billing_period: string | null; status: string;
  sub_total: number; cgst_total: number; sgst_total: number; igst_total: number; gst_amount: number;
  late_fee_total: number; total_amount: number; amount_paid: number;
  biller_gst: string | null; recipient_gst: string | null; place_of_supply: string | null;
  biller_snapshot: { legal_name?: string; address?: string; logo_url?: string } | null;
  payment_link_url: string | null;
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function renderInvoiceHtml(
  inv: Invoice,
  lines: Line[],
  config: Record<string, unknown> = {},
  parties: { billerName?: string | null; recipientName?: string | null; billerGst?: string | null; recipientGst?: string | null; qrDataUrl?: string | null } = {},
): string {
  const theme = (config.theme_color as string) || "#c2660a";
  const biller = inv.biller_snapshot?.legal_name ?? parties.billerName ?? "MyRentSaathi";
  const recipientName = parties.recipientName ?? "—";
  const billerGst = inv.biller_gst ?? parties.billerGst ?? null;
  const recipientGst = inv.recipient_gst ?? parties.recipientGst ?? null;
  const isInter = Number(inv.igst_total) > 0;
  const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
  const payable = outstanding > 0 && inv.status !== "paid" && inv.status !== "cancelled";
  const payHref = `/api/payment/redirect?invoice=${inv.id}`;

  const hasAnyGst = lines.some((l) => l.gst_applicable && l.gst_percent > 0);

  const rows = lines.map((l) => {
    const taxCell = l.gst_applicable && l.gst_percent > 0
      ? `${formatINR(l.cgst_amount + l.sgst_amount + l.igst_amount)}<div style="font-size:10px;color:#888">(${l.gst_percent}%)</div>`
      : `<span style="color:#aaa">—</span>`;
    return `
    <tr>
      <td>${esc(l.description)}</td>
      <td style="text-align:center">${esc(l.hsn_sac ?? "—")}</td>
      <td style="text-align:right">${l.quantity}</td>
      <td style="text-align:right">${formatINR(l.unit_rate)}</td>
      <td style="text-align:right">${taxCell}</td>
      <td style="text-align:right">${formatINR(l.line_total)}</td>
    </tr>`;
  }).join("");

  const taxRows = isInter
    ? `<tr><td>IGST</td><td style="text-align:right">${formatINR(inv.igst_total)}</td></tr>`
    : `<tr><td>CGST</td><td style="text-align:right">${formatINR(inv.cgst_total)}</td></tr>
       <tr><td>SGST</td><td style="text-align:right">${formatINR(inv.sgst_total)}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number)}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#222;max-width:780px;margin:0 auto;padding:28px}
    .head{display:flex;justify-content:space-between;border-bottom:3px solid ${theme};padding-bottom:14px}
    .title{color:${theme};font-size:24px;font-weight:800;margin:0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:8px 10px;border-bottom:1px solid #eee;font-size:13px}
    th{background:${theme};color:#fff;text-align:left}
    .tot td{border:none;padding:4px 10px}
    .grand{font-weight:800;font-size:16px;color:${theme}}
    .muted{color:#777;font-size:12px}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase}
    .noprint{text-align:right;margin-bottom:14px}
    .btn{display:inline-block;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer;border:none}
    @media print{.noprint{display:none!important}body{padding:0}}
  </style></head><body>
    <div class="noprint">
      ${payable ? `<a href="${payHref}" class="btn" style="background:#16a34a;color:#fff;margin-right:8px">Pay Now →</a>` : ""}
      <button class="btn" style="background:${theme};color:#fff" onclick="window.print()">🖨️ Print / Download PDF</button>
    </div>
    <div class="head">
      <div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px"><span style="color:#1a1a2e">🏠 MyRent</span><span style="color:${theme}">Saathi</span></div>
        <div style="font-weight:700;font-size:15px;color:#1a1a2e;margin-top:8px">${esc(biller)}</div>
        <div class="muted">${esc(inv.biller_snapshot?.address ?? "")}</div>
        ${billerGst ? `<div class="muted">GSTIN: <b>${esc(billerGst)}</b></div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:800;color:${theme}">TAX INVOICE</div>
        <div class="muted">${esc(inv.invoice_number)}</div>
        <div class="muted">Issue: ${esc(inv.issue_date)}${inv.due_date ? ` · Due: ${esc(inv.due_date)}` : ""}</div>
        ${payable
          ? `<a href="${payHref}" class="badge" style="background:${inv.status === "overdue" ? "#dc2626" : "#f59e0b"};color:#fff;text-decoration:none">${esc(inv.status)} · Pay →</a>`
          : `<span class="badge" style="background:${inv.status === "paid" ? "#16a34a" : "#9ca3af"};color:#fff">${esc(inv.status)}</span>`}
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-top:16px;font-size:13px">
      <div style="flex:1;background:#faf7f2;border:1px solid #eee;border-radius:8px;padding:12px">
        <div class="muted" style="font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.5px">Bill To</div>
        <div style="font-weight:700;color:#222;margin-top:2px">${esc(recipientName)}</div>
        ${recipientGst ? `<div class="muted">GSTIN: <b>${esc(recipientGst)}</b></div>` : ""}
      </div>
      <div style="flex:1;background:#faf7f2;border:1px solid #eee;border-radius:8px;padding:12px;text-align:right">
        <div class="muted">Period: <b style="color:#333">${esc(inv.billing_period ?? "—")}</b></div>
        <div class="muted">Type: <b style="color:#333">${esc(inv.invoice_type)}</b></div>
        ${inv.place_of_supply ? `<div class="muted">Place of supply: <b style="color:#333">${esc(inv.place_of_supply)}</b></div>` : ""}
      </div>
    </div>

    <table>
      <thead><tr><th>Description</th><th style="text-align:center">HSN/SAC</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Tax</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:300px;margin-left:auto" class="tot">
      <tr><td>Sub Total</td><td style="text-align:right">${formatINR(inv.sub_total)}</td></tr>
      ${hasAnyGst ? taxRows : ""}
      ${Number(inv.late_fee_total) > 0 ? `<tr><td>Late Fee</td><td style="text-align:right">${formatINR(inv.late_fee_total)}</td></tr>` : ""}
      <tr class="grand"><td>Total</td><td style="text-align:right">${formatINR(inv.total_amount)}</td></tr>
      <tr><td>Paid</td><td style="text-align:right">${formatINR(inv.amount_paid)}</td></tr>
      <tr><td>Outstanding</td><td style="text-align:right">${formatINR(outstanding)}</td></tr>
    </table>

    <div style="display:flex;align-items:center;gap:18px;margin-top:20px">
      ${parties.qrDataUrl ? `<div style="text-align:center">
        <img src="${parties.qrDataUrl}" width="118" height="118" alt="Scan to pay" style="border:1px solid #eee;border-radius:8px"/>
        <div class="muted" style="font-size:10px;margin-top:3px">Scan to Pay</div>
      </div>` : ""}
      ${payable ? `<a href="${payHref}" style="background:${theme};color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Pay Now →</a>` : ""}
    </div>
    <p class="muted" style="margin-top:24px;border-top:1px solid #eee;padding-top:10px">
      ${esc((config.footer_note as string) ?? "This is a computer-generated invoice. Thank you for your business with MyRentSaathi.")}
    </p>
  </body></html>`;
}
