/**
 * Razorpay Route API — Create Contact + Linked Account for society/landlord
 *
 * Flow:
 * 1. POST /api/razorpay-route  { entityType, entityId, bankDetails }
 * 2. Creates Razorpay Contact (the payee)
 * 3. Creates Fund Account (bank account linked to contact)
 * 4. Saves razorpay_contact_id + razorpay_fund_account_id to bank_accounts table
 *
 * These IDs are later used in payment transfers (Route splits).
 */

import { NextRequest, NextResponse } from "next/server";
import { getRazorpayKeys } from "@/lib/platform-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type BankDetails = {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: "savings" | "current";
  pan_number?: string;
  gst_number?: string;
  entity_name?: string; // for current accounts
};

async function razorpayRequest(
  path: string,
  method: "GET" | "POST",
  keyId: string,
  keySecret: string,
  body?: Record<string, unknown>
) {
  const base64 = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${base64}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = (data.error as Record<string, string> | undefined)?.description ?? JSON.stringify(data);
    throw new Error(`Razorpay API error: ${errMsg}`);
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      entityType: "society" | "landlord";
      entityId: string;        // society_id or user_id
      userId: string;          // the admin/landlord user id
      bank: BankDetails;
    };

    const { entityType, entityId, userId, bank } = body;

    if (!entityType || !entityId || !userId || !bank?.account_number || !bank?.ifsc_code || !bank?.account_holder_name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay not configured. Super Admin settings mein keys add karen." },
        { status: 500 }
      );
    }

    // Step 1: Create Razorpay Contact
    const contactPayload: Record<string, unknown> = {
      name: bank.account_holder_name,
      type: entityType === "society" ? "vendor" : "vendor",
      reference_id: `${entityType}_${entityId}`,
    };
    if (bank.pan_number) contactPayload.gstin = bank.gst_number ?? undefined;

    const contact = await razorpayRequest("/contacts", "POST", keyId, keySecret, contactPayload);
    const contactId = contact.id as string;

    // Step 2: Create Fund Account (bank account)
    const fundPayload: Record<string, unknown> = {
      contact_id: contactId,
      account_type: "bank_account",
      bank_account: {
        name: bank.account_holder_name,
        ifsc: bank.ifsc_code.toUpperCase(),
        account_number: bank.account_number,
      },
    };

    const fundAccount = await razorpayRequest("/fund_accounts", "POST", keyId, keySecret, fundPayload);
    const fundAccountId = fundAccount.id as string;

    // Step 3: Save to Supabase bank_accounts table
    const { error: dbError } = await supabaseAdmin.from("bank_accounts").upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        account_holder_name: bank.account_holder_name,
        account_number_masked: bank.account_number.slice(-4).padStart(bank.account_number.length, "•"),
        ifsc_code: bank.ifsc_code.toUpperCase(),
        account_type: bank.account_type,
        pan_number: bank.pan_number ?? null,
        gst_number: bank.gst_number ?? null,
        razorpay_contact_id: contactId,
        razorpay_fund_account_id: fundAccountId,
        is_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" }
    );

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      contactId,
      fundAccountId,
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
      .select("account_holder_name, account_number_masked, ifsc_code, account_type, pan_number, gst_number, razorpay_contact_id, razorpay_fund_account_id, is_verified, updated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single();

    return NextResponse.json({ success: true, account: data ?? null });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
