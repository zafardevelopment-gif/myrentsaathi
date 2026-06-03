import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveBillerScope } from "@/lib/billing/scope";
import { getSetupProgress } from "@/lib/onboarding/progress";

export const runtime = "nodejs";

// GET /api/dashboard/summary?userId=&role=
// Stats row (§33C): counts + monthly revenue + outstanding + setup %.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role are required" }, { status: 400 });

    const scope = await resolveBillerScope({ id: userId, role });
    if (!scope) return NextResponse.json({ error: "No billing scope for this user" }, { status: 403 });

    const scopeCol = scope.kind === "society" ? "society_id" : "owner_id";
    const scopeVal = scope.kind === "society" ? scope.societyId : scope.landlordId;
    const billerCol = scope.kind === "society" ? "society_id" : "landlord_id";

    // Units (flats)
    const { data: flats } = await supabaseAdmin.from("flats").select("id, society_id, owner_id").eq(scopeCol, scopeVal);
    const flatList = flats ?? [];
    const totalUnits = flatList.length;
    const flatIds = flatList.map((f) => f.id);

    // Tenants
    let totalTenants = 0;
    if (scope.kind === "society") {
      const { count } = await supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).eq("society_id", scope.societyId);
      totalTenants = count ?? 0;
    } else if (flatIds.length) {
      const { count } = await supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).in("flat_id", flatIds);
      totalTenants = count ?? 0;
    }

    // Owners + properties
    let totalOwners = 1;
    let totalProperties = 1;
    if (scope.kind === "society") {
      const { count } = await supabaseAdmin
        .from("society_members").select("id", { count: "exact", head: true }).eq("society_id", scope.societyId).eq("role", "landlord");
      totalOwners = count ?? 0;
      totalProperties = 1;
    } else {
      totalProperties = new Set(flatList.map((f) => f.society_id).filter(Boolean)).size || (totalUnits > 0 ? 1 : 0);
    }

    // Revenue + outstanding from invoices
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("total_amount, amount_paid, status, billing_period")
      .eq(billerCol, scopeVal)
      .neq("status", "cancelled");
    const invList = invoices ?? [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyRevenue = invList
      .filter((i) => i.billing_period === currentMonth)
      .reduce((a, i) => a + (Number(i.amount_paid) || 0), 0);
    const outstandingAmount = invList.reduce((a, i) => a + ((Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0)), 0);

    // Setup %
    const progress = await getSetupProgress({ id: userId, role });

    return NextResponse.json({
      totalProperties,
      totalUnits,
      totalTenants,
      totalOwners,
      monthlyRevenue,
      outstandingAmount,
      setupPercent: progress.percent,
      setupCompleted: progress.completed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/dashboard/summary]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
