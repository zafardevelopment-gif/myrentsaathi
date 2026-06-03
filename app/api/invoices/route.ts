import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { createInvoice, listInvoices, type CreateInvoiceInput } from "@/lib/billing/invoice-service";

export const runtime = "nodejs";

// GET /api/invoices?userId=&role=&status=&type=&period=&flatId=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope for this user" }, { status: 403 });

    const invoices = await listInvoices(scope, {
      status: sp.get("status") ?? undefined,
      invoice_type: sp.get("type") ?? undefined,
      billing_period: sp.get("period") ?? undefined,
      flat_id: sp.get("flatId") ?? undefined,
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/invoices  — manual invoice creation
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user: ScopeUser;
      invoice_type: CreateInvoiceInput["invoice_type"];
      flat_id: string;
      tenant_id?: string | null;
      agreement_id?: string | null;
      recipient_type?: CreateInvoiceInput["recipient_type"];
      recipient_user_id?: string | null;
      billing_period?: string | null;
      issue_date?: string;
      due_date?: string | null;
      lines: CreateInvoiceInput["lines"];
      notes?: string | null;
      status?: "draft" | "unpaid";
    };

    if (!body.user?.id || !body.user?.role) {
      return NextResponse.json({ error: "user {id, role} is required" }, { status: 400 });
    }
    if (!body.flat_id || !body.invoice_type) {
      return NextResponse.json({ error: "flat_id and invoice_type are required" }, { status: 400 });
    }
    if (!body.lines?.length) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope for this user" }, { status: 403 });

    const result = await createInvoice({
      scope,
      invoice_type: body.invoice_type,
      flat_id: body.flat_id,
      tenant_id: body.tenant_id ?? null,
      agreement_id: body.agreement_id ?? null,
      recipient_type: body.recipient_type,
      recipient_user_id: body.recipient_user_id ?? null,
      billing_period: body.billing_period ?? null,
      issue_date: body.issue_date,
      due_date: body.due_date ?? null,
      lines: body.lines,
      notes: body.notes ?? null,
      created_by: body.user.id,
      status: body.status,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/invoices POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
