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
  gst_percent: number; cgst_amount: number; sgst_amount: number; igst_amount: number; line_kind: string;
};
type Invoice = {
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
): string {
  const theme = (config.theme_color as string) || "#1a1a2e";
  const biller = inv.biller_snapshot?.legal_name ?? "MyRentSaathi";
  const isInter = Number(inv.igst_total) > 0;
  const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);

  const rows = lines.map((l) => `
    <tr>
      <td>${esc(l.description)}</td>
      <td style="text-align:center">${esc(l.hsn_sac ?? "—")}</td>
      <td style="text-align:right">${l.quantity}</td>
      <td style="text-align:right">${formatINR(l.unit_rate)}</td>
      <td style="text-align:right">${formatINR(l.line_total)}</td>
    </tr>`).join("");

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
  </style></head><body>
    <div class="head">
      <div><h1 class="title">${esc(biller)}</h1>
        <div class="muted">${esc(inv.biller_snapshot?.address ?? "")}</div>
        ${inv.biller_gst ? `<div class="muted">GSTIN: ${esc(inv.biller_gst)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">TAX INVOICE</div>
        <div class="muted">${esc(inv.invoice_number)}</div>
        <div class="muted">Issue: ${esc(inv.issue_date)}${inv.due_date ? ` · Due: ${esc(inv.due_date)}` : ""}</div>
        <span class="badge" style="background:${inv.status === "paid" ? "#16a34a" : inv.status === "overdue" ? "#dc2626" : "#f59e0b"};color:#fff">${esc(inv.status)}</span>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:13px">
      <div>
        <div class="muted">Bill To</div>
        ${inv.recipient_gst ? `<div class="muted">GSTIN: ${esc(inv.recipient_gst)}</div>` : ""}
        ${inv.place_of_supply ? `<div class="muted">Place of supply: ${esc(inv.place_of_supply)}</div>` : ""}
      </div>
      <div class="muted">Period: ${esc(inv.billing_period ?? "—")} · Type: ${esc(inv.invoice_type)}</div>
    </div>

    <table>
      <thead><tr><th>Description</th><th style="text-align:center">HSN/SAC</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:300px;margin-left:auto" class="tot">
      <tr><td>Sub Total</td><td style="text-align:right">${formatINR(inv.sub_total)}</td></tr>
      ${Number(inv.gst_amount) > 0 ? taxRows : ""}
      ${Number(inv.late_fee_total) > 0 ? `<tr><td>Late Fee</td><td style="text-align:right">${formatINR(inv.late_fee_total)}</td></tr>` : ""}
      <tr class="grand"><td>Total</td><td style="text-align:right">${formatINR(inv.total_amount)}</td></tr>
      <tr><td>Paid</td><td style="text-align:right">${formatINR(inv.amount_paid)}</td></tr>
      <tr><td>Outstanding</td><td style="text-align:right">${formatINR(outstanding)}</td></tr>
    </table>

    ${inv.payment_link_url ? `<p style="margin-top:18px"><a href="${esc(inv.payment_link_url)}" style="background:${theme};color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700">Pay Now →</a></p>` : ""}
    <p class="muted" style="margin-top:24px;border-top:1px solid #eee;padding-top:10px">
      ${esc((config.footer_note as string) ?? "This is a computer-generated invoice.")}
    </p>
  </body></html>`;
}
