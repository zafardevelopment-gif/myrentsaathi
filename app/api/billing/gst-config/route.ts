import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { listInvoiceTypeConfig, upsertInvoiceTypeConfig } from "@/lib/billing/config-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId"); const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json({ config: await listInvoiceTypeConfig(scope) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { user: ScopeUser; invoice_type: string; gst_applicable: boolean; default_recipient_type?: string };
    if (!body.user?.id || !body.user?.role) return NextResponse.json({ error: "user {id, role} required" }, { status: 400 });
    if (!body.invoice_type) return NextResponse.json({ error: "invoice_type required" }, { status: 400 });
    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    const result = await upsertInvoiceTypeConfig(scope, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
