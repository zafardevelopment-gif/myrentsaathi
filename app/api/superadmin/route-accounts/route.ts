import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// GET /api/superadmin/route-accounts — list all Razorpay Route linked accounts
// with their stored status, for the super-admin dashboard.
export async function GET() {
  try {
    const { data: rows } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, entity_type, entity_id, account_holder_name, account_number_masked, ifsc_code, contact_email, contact_phone, business_type, razorpay_linked_account_id, razorpay_product_id, route_status, route_error, is_verified, updated_at")
      .order("updated_at", { ascending: false });

    // Resolve a friendly entity name (society name or landlord full_name).
    const accounts = await Promise.all((rows ?? []).map(async (r) => {
      let entityName = r.account_holder_name as string;
      if (r.entity_type === "society") {
        const { data: s } = await supabaseAdmin.from("societies").select("name").eq("id", r.entity_id).maybeSingle();
        entityName = s?.name ?? entityName;
      } else {
        const { data: u } = await supabaseAdmin.from("users").select("full_name").eq("id", r.entity_id).maybeSingle();
        entityName = u?.full_name ?? entityName;
      }
      return { ...r, entity_name: entityName };
    }));

    return NextResponse.json({ success: true, accounts });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
