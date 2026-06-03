/**
 * Invoice service — server-side creation/generation/reads.
 * Uses the service-role client (bypasses RLS); call ONLY from route handlers.
 *
 * Pipeline (design §7, §3, §19): resolve scope → snapshot biller + recipient +
 * GST identity → compute per-line CGST/SGST/IGST split → atomic gapless number →
 * insert header + lines.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeInsert } from "./scope";
import { financialYear, getActiveGstRate, computeLine, computeTotals } from "./gst";
import type { DraftLineItem, InvoiceType, RecipientType } from "./types";

const PREFIX: Record<string, string> = {
  rent: "RENT",
  maintenance: "MNT",
  electricity: "ELEC",
  charges: "CHG",
};

const DEFAULT_RECIPIENT: Record<InvoiceType, RecipientType> = {
  rent: "tenant",
  electricity: "tenant",
  maintenance: "owner",
  charges: "tenant",
};

export type CreateInvoiceInput = {
  scope: BillerScope;
  invoice_type: InvoiceType;
  flat_id: string;
  tenant_id?: string | null;
  agreement_id?: string | null;
  recipient_type?: RecipientType;
  recipient_user_id?: string | null;
  billing_period?: string | null; // 'YYYY-MM'
  issue_date?: string; // 'YYYY-MM-DD'
  due_date?: string | null;
  lines: DraftLineItem[];
  notes?: string | null;
  created_by?: string | null;
  status?: "draft" | "unpaid";
};

export type CreateInvoiceResult =
  | { success: true; invoiceId: string; invoiceNumber: string }
  | { success: false; error: string; code?: string };

// ─── HELPERS ──────────────────────────────────────────────────

async function loadBillerProfile(scope: BillerScope) {
  const { column, value } = scope.kind === "society"
    ? { column: "society_id", value: scope.societyId }
    : { column: "landlord_id", value: scope.landlordId };
  const { data } = await supabaseAdmin
    .from("billing_profiles")
    .select("legal_name, gst_number, pan_number, state_code, address, logo_url")
    .eq(column, value)
    .maybeSingle();
  return data ?? null;
}

// ─── CREATE ───────────────────────────────────────────────────

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  try {
    const issueDate = input.issue_date ?? new Date().toISOString().slice(0, 10);

    // 1. Flat + property (society) context
    const { data: flat } = await supabaseAdmin
      .from("flats")
      .select("id, owner_id, current_tenant_id, society_id, flat_number, block, rent_gst_applicable")
      .eq("id", input.flat_id)
      .maybeSingle();
    if (!flat) return { success: false, error: "Flat not found.", code: "FLAT_MISSING" };

    let placeOfSupply: string | null = null;
    if (flat.society_id) {
      const { data: soc } = await supabaseAdmin.from("societies").select("state_code").eq("id", flat.society_id).maybeSingle();
      placeOfSupply = soc?.state_code ?? null;
    }

    // 2. Biller snapshot
    const profile = await loadBillerProfile(input.scope);
    const billerState = profile?.state_code ?? null;
    const billerGst = profile?.gst_number ?? null;
    if (!placeOfSupply) placeOfSupply = billerState; // default intra-state when property state unknown

    // 3. Recipient snapshot
    const recipient = await resolveRecipientSafe(input.scope, input.invoice_type, flat, {
      recipient_type: input.recipient_type,
      recipient_user_id: input.recipient_user_id,
      agreement_id: input.agreement_id,
    });

    // 4. GST rate (versioned, snapshotted)
    const appliesTo = input.invoice_type === "rent" ? "rent" : input.invoice_type;
    const rate = await getActiveGstRate(input.scope, appliesTo, issueDate);

    // 5. Compute lines + totals (CGST/SGST/IGST per line)
    const computed = input.lines.map((l) => computeLine(l, rate, billerState, placeOfSupply));
    const totals = computeTotals(computed);

    // 6. Atomic gapless number
    const fy = financialYear(new Date(issueDate));
    const prefix = PREFIX[input.invoice_type] ?? "INV";
    const societyId = input.scope.kind === "society" ? input.scope.societyId : null;
    const landlordId = input.scope.kind === "landlord" ? input.scope.landlordId : null;
    const { data: numberData, error: numErr } = await supabaseAdmin.rpc("next_doc_number", {
      p_society: societyId,
      p_landlord: landlordId,
      p_doc_type: input.invoice_type,
      p_fy: fy,
      p_prefix: prefix,
    });
    if (numErr || !numberData) return { success: false, error: numErr?.message ?? "Numbering failed." };
    const invoiceNumber = numberData as string;

    // 7. Insert header
    const scopeCols = scopeInsert(input.scope);
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: input.invoice_type,
        ...scopeCols,
        flat_id: input.flat_id,
        tenant_id: input.tenant_id ?? null,
        agreement_id: input.agreement_id ?? null,
        recipient_type: recipient.recipient_type,
        recipient_user_id: recipient.recipient_user_id,
        billing_period: input.billing_period ?? null,
        issue_date: issueDate,
        due_date: input.due_date ?? null,
        sub_total: totals.sub_total,
        gst_percent: totals.gst_percent,
        gst_amount: totals.gst_amount,
        cgst_total: totals.cgst_total,
        sgst_total: totals.sgst_total,
        igst_total: totals.igst_total,
        gst_breakup: totals.gst_breakup,
        total_amount: totals.total_amount,
        amount_paid: 0,
        status: input.status ?? "unpaid",
        biller_gst: billerGst,
        recipient_gst: recipient.recipient_gst,
        place_of_supply: placeOfSupply,
        biller_snapshot: profile
          ? { legal_name: profile.legal_name, address: profile.address, logo_url: profile.logo_url }
          : null,
        notes: input.notes ?? null,
        created_by: input.created_by ?? null,
      })
      .select("id")
      .single();

    if (invErr || !inv) {
      // Idempotency: a duplicate auto-invoice for (flat, type, period) is a benign skip.
      if (invErr?.code === "23505") return { success: false, error: "Invoice already exists for this period.", code: "DUPLICATE" };
      return { success: false, error: invErr?.message ?? "Failed to create invoice." };
    }

    // 8. Insert line items
    if (computed.length > 0) {
      const rows = computed.map((c, i) => ({
        invoice_id: inv.id,
        line_kind: c.line_kind,
        charge_type_id: c.charge_type_id,
        description: c.description,
        hsn_sac: c.hsn_sac,
        quantity: c.quantity,
        unit_rate: c.unit_rate,
        line_total: c.line_total,
        gst_applicable: c.gst_applicable,
        gst_percent: c.gst_percent,
        gst_amount: c.gst_amount,
        cgst_percent: c.cgst_percent,
        cgst_amount: c.cgst_amount,
        sgst_percent: c.sgst_percent,
        sgst_amount: c.sgst_amount,
        igst_percent: c.igst_percent,
        igst_amount: c.igst_amount,
        meter_reading_id: c.meter_reading_id,
        sort_order: c.sort_order || i,
      }));
      const { error: liErr } = await supabaseAdmin.from("invoice_line_items").insert(rows);
      if (liErr) return { success: false, error: liErr.message };
    }

    return { success: true, invoiceId: inv.id, invoiceNumber };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Recipient resolution with tenant GSTIN/state lookup done correctly. */
async function resolveRecipientSafe(
  scope: BillerScope,
  invoiceType: InvoiceType,
  flat: { owner_id: string | null; current_tenant_id: string | null; society_id: string | null },
  override: { recipient_type?: RecipientType; recipient_user_id?: string | null; agreement_id?: string | null },
) {
  let recipientType = override.recipient_type;
  if (!recipientType) {
    const { column, value } = scope.kind === "society"
      ? { column: "society_id", value: scope.societyId }
      : { column: "landlord_id", value: scope.landlordId };
    const { data: cfg } = await supabaseAdmin
      .from("invoice_type_config")
      .select("default_recipient_type")
      .eq(column, value)
      .eq("invoice_type", invoiceType)
      .maybeSingle();
    recipientType = (cfg?.default_recipient_type as RecipientType) ?? DEFAULT_RECIPIENT[invoiceType];
  }

  let userId = override.recipient_user_id ?? null;
  if (!userId) {
    if (recipientType === "owner") userId = flat.owner_id;
    else if (recipientType === "tenant") userId = flat.current_tenant_id;
    else if (recipientType === "landlord" && override.agreement_id) {
      const { data: ag } = await supabaseAdmin.from("agreements").select("landlord_id").eq("id", override.agreement_id).maybeSingle();
      userId = ag?.landlord_id ?? flat.owner_id;
    } else userId = flat.owner_id ?? flat.current_tenant_id;
  }

  let recipientName: string | null = null;
  let recipientGst: string | null = null;
  let recipientState: string | null = null;
  if (userId) {
    const { data: u } = await supabaseAdmin.from("users").select("full_name").eq("id", userId).maybeSingle();
    recipientName = u?.full_name ?? null;
    if (recipientType === "tenant") {
      const { data: t } = await supabaseAdmin
        .from("tenants").select("gst_number, state_code").eq("user_id", userId).limit(1).maybeSingle();
      recipientGst = t?.gst_number ?? null;
      recipientState = t?.state_code ?? null;
    }
  }
  return { recipient_type: recipientType, recipient_user_id: userId, recipient_gst: recipientGst, recipient_state: recipientState, recipient_name: recipientName };
}

// ─── READS ────────────────────────────────────────────────────

export type InvoiceFilters = { status?: string; invoice_type?: string; billing_period?: string; flat_id?: string };

export async function listInvoices(scope: BillerScope, filters: InvoiceFilters = {}) {
  const { column, value } = scope.kind === "society"
    ? { column: "society_id", value: scope.societyId }
    : { column: "landlord_id", value: scope.landlordId };
  let q = supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, invoice_type, flat_id, recipient_type, recipient_user_id, billing_period, issue_date, due_date, sub_total, gst_amount, total_amount, amount_paid, status, created_at")
    .eq(column, value)
    .order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.invoice_type) q = q.eq("invoice_type", filters.invoice_type);
  if (filters.billing_period) q = q.eq("billing_period", filters.billing_period);
  if (filters.flat_id) q = q.eq("flat_id", filters.flat_id);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ─── BATCH GENERATION (rent & maintenance for a period) ──────

export type GenerateInput = {
  scope: BillerScope;
  invoice_type: "rent" | "maintenance";
  billing_period: string; // 'YYYY-MM'
  due_day?: number; // default 5
  created_by?: string | null;
  trigger?: "manual" | "cron";
};

export type GenerateResult = {
  created: number;
  skipped: number;
  errors: { flat_id: string; code: string; message: string }[];
  runId: string | null;
};

export async function generateForPeriod(input: GenerateInput): Promise<GenerateResult> {
  const period = input.billing_period;
  const dueDay = String(input.due_day ?? 5).padStart(2, "0");
  const dueDate = `${period}-${dueDay}`;
  const issueDate = `${period}-01`;
  const monthLabel = new Date(`${period}-01`).toLocaleString("en-IN", { month: "long", year: "numeric" });

  // Eligible flats for this scope.
  const flatQ = supabaseAdmin
    .from("flats")
    .select("id, flat_number, block, society_id, owner_id, current_tenant_id, monthly_rent, maintenance_amount, rent_gst_applicable");
  const flats = input.scope.kind === "society"
    ? (await flatQ.eq("society_id", input.scope.societyId)).data ?? []
    : (await flatQ.eq("owner_id", input.scope.landlordId)).data ?? [];

  // Biller GST presence + rent GST config (resolved once).
  const profile = await loadBillerProfile(input.scope);
  const billerHasGst = !!profile?.gst_number;
  const cfgCol = input.scope.kind === "society"
    ? { column: "society_id", value: input.scope.societyId }
    : { column: "landlord_id", value: input.scope.landlordId };
  const { data: cfg } = await supabaseAdmin
    .from("invoice_type_config")
    .select("gst_applicable")
    .eq(cfgCol.column, cfgCol.value)
    .eq("invoice_type", input.invoice_type)
    .maybeSingle();
  const typeGstApplicable = cfg?.gst_applicable ?? false;

  const errors: GenerateResult["errors"] = [];
  let created = 0;
  let skipped = 0;

  for (const flat of flats) {
    try {
      let line: DraftLineItem | null = null;
      let tenantId: string | null = null;
      let agreementId: string | null = null;

      if (input.invoice_type === "rent") {
        if (!flat.current_tenant_id) { skipped++; continue; } // vacant → nothing to bill
        // tenant row + active agreement
        const { data: tenantRow } = await supabaseAdmin
          .from("tenants").select("id, monthly_rent").eq("flat_id", flat.id).eq("status", "active").limit(1).maybeSingle();
        tenantId = tenantRow?.id ?? null;
        const { data: ag } = await supabaseAdmin
          .from("agreements").select("id, monthly_rent").eq("flat_id", flat.id).eq("status", "active").limit(1).maybeSingle();
        agreementId = ag?.id ?? null;
        const rent = ag?.monthly_rent ?? tenantRow?.monthly_rent ?? flat.monthly_rent ?? 0;
        if (!rent || rent <= 0) { skipped++; continue; }
        const rentGst = typeGstApplicable && !!flat.rent_gst_applicable && billerHasGst;
        line = { description: `Rent — ${monthLabel} (Flat ${flat.flat_number})`, unit_rate: rent, gst_applicable: rentGst, hsn_sac: "997212" };
      } else {
        // maintenance
        let amount = flat.maintenance_amount ?? 0;
        if (!amount && flat.society_id) {
          const { data: soc } = await supabaseAdmin.from("societies").select("maintenance_amount").eq("id", flat.society_id).maybeSingle();
          amount = soc?.maintenance_amount ?? 0;
        }
        if (!amount || amount <= 0) { skipped++; continue; }
        line = { description: `Maintenance — ${monthLabel} (Flat ${flat.flat_number})`, unit_rate: amount, gst_applicable: false };
      }

      const res = await createInvoice({
        scope: input.scope,
        invoice_type: input.invoice_type,
        flat_id: flat.id,
        tenant_id: tenantId,
        agreement_id: agreementId,
        billing_period: period,
        issue_date: issueDate,
        due_date: dueDate,
        lines: [line],
        created_by: input.created_by ?? null,
      });

      if (res.success) created++;
      else if (res.code === "DUPLICATE") skipped++;
      else errors.push({ flat_id: flat.id, code: res.code ?? "ERROR", message: res.error });
    } catch (e) {
      errors.push({ flat_id: flat.id, code: "EXCEPTION", message: e instanceof Error ? e.message : String(e) });
    }
  }

  // Audit run
  const { data: run } = await supabaseAdmin
    .from("invoice_runs")
    .insert({
      invoice_type: input.invoice_type,
      billing_period: period,
      scope_society: input.scope.kind === "society" ? input.scope.societyId : null,
      scope_landlord: input.scope.kind === "landlord" ? input.scope.landlordId : null,
      trigger: input.trigger ?? "manual",
      count_created: created,
      count_skipped: skipped,
      errors,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return { created, skipped, errors, runId: run?.id ?? null };
}

/**
 * Recompute an invoice header's money totals from its current line items.
 * Used after late fees (§21) or line edits change the set of lines.
 * late_fee lines roll into late_fee_total (not sub_total/GST).
 */
export async function recomputeInvoiceTotals(invoiceId: string): Promise<void> {
  const { data: lines } = await supabaseAdmin
    .from("invoice_line_items")
    .select("line_kind, line_total, gst_amount, cgst_amount, sgst_amount, igst_amount")
    .eq("invoice_id", invoiceId);
  const rows = lines ?? [];
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const base = rows.filter((l) => l.line_kind !== "late_fee");
  const lateFee = rows.filter((l) => l.line_kind === "late_fee");
  const sub_total = r2(base.reduce((a, l) => a + Number(l.line_total || 0), 0));
  const cgst = r2(base.reduce((a, l) => a + Number(l.cgst_amount || 0), 0));
  const sgst = r2(base.reduce((a, l) => a + Number(l.sgst_amount || 0), 0));
  const igst = r2(base.reduce((a, l) => a + Number(l.igst_amount || 0), 0));
  const gst_amount = r2(cgst + sgst + igst);
  const late_fee_total = r2(lateFee.reduce((a, l) => a + Number(l.line_total || 0), 0));
  const total_amount = r2(sub_total + gst_amount + late_fee_total);

  await supabaseAdmin.from("invoices").update({
    sub_total, cgst_total: cgst, sgst_total: sgst, igst_total: igst,
    gst_amount, gst_breakup: { cgst, sgst, igst }, late_fee_total, total_amount,
    updated_at: new Date().toISOString(),
  }).eq("id", invoiceId);
}

/**
 * Edit an UNPAID invoice's line amounts (§ user edit). Re-resolves GST per line
 * from the current per-type rates and recomputes totals. Refused once any
 * payment exists (paid/partially_paid) or the invoice is cancelled.
 */
export async function updateInvoiceLines(
  invoiceId: string,
  updates: { id: string; unit_rate: number }[],
): Promise<{ success: boolean; error?: string }> {
  const { data: inv } = await supabaseAdmin
    .from("invoices").select("status, amount_paid, place_of_supply, society_id, landlord_id").eq("id", invoiceId).maybeSingle();
  if (!inv) return { success: false, error: "Invoice not found" };
  if (inv.status === "cancelled") return { success: false, error: "Cannot edit a cancelled invoice" };
  if (Number(inv.amount_paid) > 0) return { success: false, error: "Cannot edit a bill that already has a payment" };

  const scope: BillerScope = inv.society_id
    ? { kind: "society", societyId: inv.society_id }
    : { kind: "landlord", landlordId: inv.landlord_id as string };
  const billerCol = scope.kind === "society" ? "society_id" : "landlord_id";
  const billerVal = scope.kind === "society" ? scope.societyId : scope.landlordId;
  const { data: prof } = await supabaseAdmin.from("billing_profiles").select("state_code").eq(billerCol, billerVal).maybeSingle();
  const billerState = prof?.state_code ?? null;
  const today = new Date().toISOString().slice(0, 10);

  // Current per-type GST rates.
  const rates: Record<string, number> = {
    rent: (await getActiveGstRate(scope, "rent", today)).rate_percent,
    maintenance: (await getActiveGstRate(scope, "maintenance", today)).rate_percent,
    electricity: (await getActiveGstRate(scope, "electricity", today)).rate_percent,
  };
  const typeOf = (desc: string): keyof typeof rates =>
    /^rent/i.test(desc) ? "rent" : /^maintenance/i.test(desc) ? "maintenance" : "electricity";

  for (const u of updates) {
    const { data: line } = await supabaseAdmin
      .from("invoice_line_items").select("description, hsn_sac, quantity, line_kind, charge_type_id, meter_reading_id").eq("id", u.id).maybeSingle();
    if (!line) continue;
    const gstPct = line.line_kind === "late_fee" ? 0 : rates[typeOf(line.description)];
    const c = computeLine(
      { description: line.description, hsn_sac: line.hsn_sac, quantity: line.quantity ?? 1, unit_rate: u.unit_rate,
        gst_applicable: gstPct > 0, gst_percent: gstPct, line_kind: line.line_kind, charge_type_id: line.charge_type_id, meter_reading_id: line.meter_reading_id },
      { rate_percent: gstPct, cgst_percent: 0, sgst_percent: 0 }, billerState, inv.place_of_supply,
    );
    await supabaseAdmin.from("invoice_line_items").update({
      unit_rate: c.unit_rate, line_total: c.line_total, gst_applicable: c.gst_applicable, gst_percent: c.gst_percent,
      gst_amount: c.gst_amount, cgst_percent: c.cgst_percent, cgst_amount: c.cgst_amount,
      sgst_percent: c.sgst_percent, sgst_amount: c.sgst_amount, igst_percent: c.igst_percent, igst_amount: c.igst_amount,
    }).eq("id", u.id);
  }
  await recomputeInvoiceTotals(invoiceId);
  return { success: true };
}

export async function getInvoiceDetail(invoiceId: string) {
  const { data: invoice } = await supabaseAdmin.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return null;
  const { data: lines } = await supabaseAdmin
    .from("invoice_line_items").select("*").eq("invoice_id", invoiceId).order("sort_order");
  const { data: payments } = await supabaseAdmin
    .from("invoice_payments").select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
  return { invoice, lines: lines ?? [], payments: payments ?? [] };
}
