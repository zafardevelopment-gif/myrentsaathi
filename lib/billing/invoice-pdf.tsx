/**
 * React-PDF invoice document for email attachment.
 * Generates a proper PDF binary using @react-pdf/renderer.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const BRAND = "#c2660a";
const DARK = "#1a1a2e";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#222", padding: 32, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 12, marginBottom: 12 },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK },
  logoAccent: { color: BRAND },
  invMeta: { textAlign: "right" },
  invTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND },
  muted: { fontSize: 9, color: "#777" },
  badge: { marginTop: 4, backgroundColor: "#f59e0b", color: "#fff", fontSize: 9, fontFamily: "Helvetica-Bold", padding: "2 8", borderRadius: 8 },
  badgePaid: { backgroundColor: "#16a34a" },
  parties: { flexDirection: "row", gap: 12, marginBottom: 14 },
  partyBox: { flex: 1, backgroundColor: "#faf7f2", borderWidth: 1, borderColor: "#eee", borderRadius: 6, padding: 10 },
  partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#222" },
  table: { marginBottom: 10 },
  thead: { flexDirection: "row", backgroundColor: BRAND, borderRadius: 4 },
  th: { flex: 1, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9, padding: "6 8", textTransform: "uppercase" },
  thRight: { textAlign: "right" },
  thNarrow: { flex: 0.4 },
  thTax: { flex: 0.5, textAlign: "right" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  td: { flex: 1, fontSize: 9, padding: "6 8", color: "#333" },
  tdRight: { textAlign: "right" },
  tdNarrow: { flex: 0.4, textAlign: "right" },
  tdTax: { flex: 0.5, textAlign: "right" },
  totalsBox: { alignItems: "flex-end", marginTop: 6 },
  totRow: { flexDirection: "row", width: 220 },
  totLabel: { flex: 1, fontSize: 9, color: "#555", padding: "3 8" },
  totVal: { fontSize: 9, color: "#333", padding: "3 8", textAlign: "right", width: 80 },
  grandRow: { flexDirection: "row", width: 220, backgroundColor: "#fff3e8", borderRadius: 4, marginTop: 2 },
  grandLabel: { flex: 1, fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND, padding: "5 8" },
  grandVal: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND, padding: "5 8", textAlign: "right", width: 80 },
  footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8, fontSize: 8, color: "#aaa", textAlign: "center" },
});

type Line = { description: string; hsn_sac: string | null; quantity: number; unit_rate: number; line_total: number; gst_percent: number; cgst_amount: number; sgst_amount: number; igst_amount: number };
type InvData = {
  invoice_number: string; invoice_type: string; billing_period: string | null;
  issue_date: string; due_date: string | null; status: string;
  sub_total: number; cgst_total: number; sgst_total: number; igst_total: number;
  gst_amount: number; total_amount: number; amount_paid: number;
  biller_gst: string | null; recipient_gst: string | null;
};

const inr = (n: number) => "Rs." + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function InvoiceDoc({ inv, lines, billerName, recipientName }: {
  inv: InvData; lines: Line[]; billerName: string | null; recipientName: string | null;
}) {
  const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
  const isPaid = inv.status === "paid";
  const hasGst = Number(inv.gst_amount) > 0;
  const isInter = Number(inv.igst_total) > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>MyRent<Text style={s.logoAccent}>Saathi</Text></Text>
            <Text style={s.muted}>{billerName ?? "MyRentSaathi"}</Text>
            {inv.biller_gst && <Text style={s.muted}>GSTIN: {inv.biller_gst}</Text>}
          </View>
          <View style={s.invMeta}>
            <Text style={s.invTitle}>TAX INVOICE</Text>
            <Text style={s.muted}>{inv.invoice_number}</Text>
            <Text style={s.muted}>Issue: {inv.issue_date}{inv.due_date ? `  Due: ${inv.due_date}` : ""}</Text>
            <View style={[s.badge, isPaid ? s.badgePaid : {}]}>
              <Text>{inv.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Bill To</Text>
            <Text style={s.partyName}>{recipientName ?? "—"}</Text>
            {inv.recipient_gst && <Text style={s.muted}>GSTIN: {inv.recipient_gst}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={[s.muted, { textAlign: "right" }]}>Period: {inv.billing_period ?? "—"}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Type: {inv.invoice_type}</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, { flex: 3 }]}>Description</Text>
            <Text style={[s.th, s.thNarrow]}>Qty</Text>
            <Text style={[s.th, s.thRight]}>Rate</Text>
            <Text style={[s.th, s.thTax]}>Tax</Text>
            <Text style={[s.th, s.thRight]}>Amount</Text>
          </View>
          {lines.map((l, i) => {
            const taxAmt = l.cgst_amount + l.sgst_amount + l.igst_amount;
            return (
              <View key={i} style={s.tr}>
                <Text style={[s.td, { flex: 3 }]}>{l.description}</Text>
                <Text style={[s.td, s.tdNarrow]}>{l.quantity}</Text>
                <Text style={[s.td, s.tdRight]}>{inr(l.unit_rate)}</Text>
                <Text style={[s.td, s.tdTax]}>
                  {taxAmt > 0 ? `${inr(taxAmt)}\n(${l.gst_percent}%)` : "—"}
                </Text>
                <Text style={[s.td, s.tdRight]}>{inr(l.line_total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Sub Total</Text>
            <Text style={s.totVal}>{inr(inv.sub_total)}</Text>
          </View>
          {hasGst && !isInter && (
            <>
              <View style={s.totRow}>
                <Text style={s.totLabel}>CGST</Text>
                <Text style={s.totVal}>{inr(inv.cgst_total)}</Text>
              </View>
              <View style={s.totRow}>
                <Text style={s.totLabel}>SGST</Text>
                <Text style={s.totVal}>{inr(inv.sgst_total)}</Text>
              </View>
            </>
          )}
          {hasGst && isInter && (
            <View style={s.totRow}>
              <Text style={s.totLabel}>IGST</Text>
              <Text style={s.totVal}>{inr(inv.igst_total)}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandVal}>{inr(inv.total_amount)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Paid</Text>
            <Text style={s.totVal}>{inr(inv.amount_paid)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={[s.totLabel, { fontFamily: "Helvetica-Bold" }]}>Outstanding</Text>
            <Text style={[s.totVal, { fontFamily: "Helvetica-Bold", color: outstanding > 0 ? BRAND : "#16a34a" }]}>{inr(outstanding)}</Text>
          </View>
        </View>

        <Text style={s.footer}>This is a computer-generated invoice. Thank you for your business with MyRentSaathi.</Text>
      </Page>
    </Document>
  );
}

export async function generateInvoicePdf(
  inv: Record<string, unknown>,
  lines: Record<string, unknown>[],
  billerName: string | null,
  recipientName: string | null,
): Promise<Buffer> {
  const doc = (
    <InvoiceDoc
      inv={inv as unknown as InvData}
      lines={lines as unknown as Line[]}
      billerName={billerName}
      recipientName={recipientName}
    />
  );
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
