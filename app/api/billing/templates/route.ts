import { NextRequest, NextResponse } from "next/server";
import { resolveBillerScope, type ScopeUser } from "@/lib/billing/scope";
import { listTemplates, upsertTemplate } from "@/lib/billing/config-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId"); const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    return NextResponse.json({ templates: await listTemplates(scope) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      user: ScopeUser; id?: string; name: string; applies_to?: string; is_default?: boolean; config?: Record<string, unknown>;
    };
    if (!body.user?.id || !body.user?.role) return NextResponse.json({ error: "user {id, role} required" }, { status: 400 });
    if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const scope = await resolveBillerScope(body.user);
    if (!scope) return NextResponse.json({ error: "No billing scope" }, { status: 403 });
    const result = await upsertTemplate(scope, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
