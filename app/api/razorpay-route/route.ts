/**
 * Razorpay Route — Create a LINKED ACCOUNT (sub-merchant) for a society/landlord.
 *
 * Route v2 onboarding flow (money settles directly to the linked account's bank):
 *   1. POST /v2/accounts                        → linked account (acc_*)
 *   2. POST /v2/accounts/{id}/stakeholders       → stakeholder (KYC owner)
 *   3. POST /v2/accounts/{id}/products           → request the "route" product
 *   4. PATCH /v2/accounts/{id}/products/{prodId}  → add settlement bank details
 *
 * The linked account id (acc_*) is later used as the `account` in payment
 * transfers, so the tenant's payment auto-splits to the landlord/society.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRazorpayKeys } from "@/lib/platform-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60; // Route KYC onboarding makes several Razorpay calls

type BankDetails = {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: "savings" | "current";
  pan_number: string;
  gst_number?: string;
  business_type?: string;       // individual | proprietorship | partnership | private_limited | trust | society | ngo
  contact_email: string;
  contact_phone: string;
  address_street: string;
  address_city: string;
  address_state: string;        // e.g. KARNATAKA (uppercase state name)
  address_postal_code: string;
};

async function rzp(
  path: string,
  method: "GET" | "POST" | "PATCH",
  keyId: string,
  keySecret: string,
  body?: Record<string, unknown>,
) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  // 20s timeout so a slow/unreachable Razorpay call surfaces an error
  // instead of hanging the "Linking…" button forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`https://api.razorpay.com${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error((e as Error).name === "AbortError" ? "Razorpay request timed out" : `Network error: ${(e as Error).message}`);
  }
  clearTimeout(timer);
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = (data.error as Record<string, string> | undefined)?.description ?? JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      entityType: "society" | "landlord";
      entityId: string;
      userId: string;
      bank: BankDetails;
    };
    const { entityType, entityId, userId, bank } = body;

    // ── Validation ──
    if (!entityType || !entityId || !userId) {
      return NextResponse.json({ success: false, error: "Missing entity fields" }, { status: 400 });
    }
    const required: [keyof BankDetails, string][] = [
      ["account_holder_name", "Account holder name"], ["account_number", "Account number"],
      ["ifsc_code", "IFSC code"], ["pan_number", "PAN number"], ["contact_email", "Email"],
      ["contact_phone", "Phone"], ["address_street", "Address"], ["address_city", "City"],
      ["address_state", "State"], ["address_postal_code", "Postal code"],
    ];
    for (const [key, label] of required) {
      if (!bank?.[key]) return NextResponse.json({ success: false, error: `${label} is required` }, { status: 400 });
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(bank.pan_number.toUpperCase())) {
      return NextResponse.json({ success: false, error: "Invalid PAN format" }, { status: 400 });
    }

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) {
      return NextResponse.json({ success: false, error: "Razorpay not configured. Add keys in Super Admin settings." }, { status: 500 });
    }

    const businessType = bank.business_type ?? (entityType === "landlord" ? "individual" : "society");
    const pan = bank.pan_number.toUpperCase();
    const phone = bank.contact_phone.replace(/\D/g, "").slice(-10);

    // ── Persist bank details FIRST (fast write) so the user always gets a saved
    //    record, even if the Razorpay onboarding below is slow or fails. ──
    const baseRow = {
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      account_holder_name: bank.account_holder_name,
      account_number_masked: bank.account_number.slice(-4).padStart(bank.account_number.length, "•"),
      ifsc_code: bank.ifsc_code.toUpperCase(),
      account_type: bank.account_type,
      pan_number: pan,
      gst_number: bank.gst_number?.toUpperCase() ?? null,
      business_type: businessType,
      contact_email: bank.contact_email,
      contact_phone: phone,
      address_street: bank.address_street,
      address_city: bank.address_city,
      address_state: bank.address_state.toUpperCase(),
      address_postal_code: bank.address_postal_code,
      route_status: "pending",
      updated_at: new Date().toISOString(),
    };
    const { error: saveErr } = await supabaseAdmin.from("bank_accounts").upsert(baseRow, { onConflict: "entity_type,entity_id" });
    if (saveErr) {
      // Most likely the Route columns are missing → run the migration.
      const hint = /column .* does not exist/i.test(saveErr.message)
        ? " — run migration bank_accounts-route-v2.sql in Supabase."
        : "";
      return NextResponse.json({ success: false, error: `Could not save bank details: ${saveErr.message}${hint}` }, { status: 500 });
    }

    let linkedAccountId: string | null = null;
    let stakeholderId: string | null = null;
    let productId: string | null = null;
    let routeStatus = "failed";
    let routeError: string | null = null;

    try {
      // For an individual/proprietor, PAN is the OWNER's PAN (goes on the
      // stakeholder), NOT a company PAN — Razorpay rejects `legal_info.pan`
      // for business_type "individual"/"proprietorship". Only registered
      // entities (company/partnership/trust/society) carry a company PAN/GST.
      const isIndividual = businessType === "individual" || businessType === "proprietorship";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountPayload: any = {
        email: bank.contact_email,
        phone,
        type: "route",
        reference_id: `${entityType.slice(0, 3)}_${entityId.slice(-30)}`,
        legal_business_name: bank.account_holder_name,
        business_type: businessType,
        contact_name: bank.account_holder_name,
        profile: {
          category: "others",
          subcategory: "others",
          addresses: {
            registered: {
              street1: bank.address_street,
              street2: bank.address_city,
              city: bank.address_city,
              state: bank.address_state.toUpperCase(),
              postal_code: bank.address_postal_code,
              country: "IN",
            },
          },
        },
      };
      if (!isIndividual) {
        accountPayload.legal_info = { pan, ...(bank.gst_number ? { gst: bank.gst_number.toUpperCase() } : {}) };
      } else if (bank.gst_number) {
        accountPayload.legal_info = { gst: bank.gst_number.toUpperCase() };
      }
      const account = await rzp("/v2/accounts", "POST", keyId, keySecret, accountPayload);
      linkedAccountId = account.id as string;

      // Step 2: Stakeholder (KYC owner)
      try {
        const stakeholder = await rzp(`/v2/accounts/${linkedAccountId}/stakeholders`, "POST", keyId, keySecret, {
          name: bank.account_holder_name,
          email: bank.contact_email,
          kyc: { pan },
        });
        stakeholderId = stakeholder.id as string;
      } catch (e) {
        routeError = `Stakeholder: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Step 3: Request route product
      const product = await rzp(`/v2/accounts/${linkedAccountId}/products`, "POST", keyId, keySecret, {
        product_name: "route",
        tnc_accepted: true,
      });
      productId = product.id as string;

      // Step 4: Add settlement bank details to the product config
      const updated = await rzp(`/v2/accounts/${linkedAccountId}/products/${productId}`, "PATCH", keyId, keySecret, {
        settlements: {
          account_number: bank.account_number,
          ifsc_code: bank.ifsc_code.toUpperCase(),
          beneficiary_name: bank.account_holder_name,
        },
        tnc_accepted: true,
      });
      const activationStatus = (updated.activation_status as string) ?? "";
      routeStatus = activationStatus === "activated" ? "activated"
        : activationStatus === "needs_clarification" ? "needs_clarification"
        : "created";
    } catch (e) {
      routeError = (routeError ? routeError + " | " : "") + (e instanceof Error ? e.message : String(e));
      // If linked account was created but a later step failed, keep the id so we can retry.
    }

    // ── Update the saved row with the Razorpay onboarding results ──
    await supabaseAdmin.from("bank_accounts").update({
      razorpay_linked_account_id: linkedAccountId,
      razorpay_stakeholder_id: stakeholderId,
      razorpay_product_id: productId,
      route_status: routeStatus,
      route_error: routeError,
      is_verified: routeStatus === "activated" || routeStatus === "created",
      updated_at: new Date().toISOString(),
    }).eq("entity_type", entityType).eq("entity_id", entityId);

    if (!linkedAccountId) {
      // Bank details ARE saved — surface the Razorpay issue but don't lose the row.
      return NextResponse.json({
        success: true,
        saved: true,
        routeStatus: "failed",
        warning: routeError ?? "Bank details saved, but Razorpay linking failed. You can retry from Update Account.",
      });
    }

    return NextResponse.json({
      success: true,
      linkedAccountId,
      productId,
      routeStatus,
      ...(routeError ? { warning: routeError } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[razorpay-route] ERROR:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ success: false, error: "entityType and entityId required" }, { status: 400 });
  }
  try {
    const { data } = await supabaseAdmin
      .from("bank_accounts")
      .select("account_holder_name, account_number_masked, ifsc_code, account_type, pan_number, gst_number, business_type, contact_email, contact_phone, address_street, address_city, address_state, address_postal_code, razorpay_linked_account_id, razorpay_product_id, route_status, route_error, is_verified, updated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    return NextResponse.json({ success: true, account: data ?? null });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
