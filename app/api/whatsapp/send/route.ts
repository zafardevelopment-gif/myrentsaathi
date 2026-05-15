import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/whatsapp/send
 * Sends a WhatsApp template message via Meta Cloud API.
 *
 * Body:
 *   to       — phone in E.164 format, e.g. "+919876543210"
 *   template — Meta template name, e.g. "mrs_welcome"
 *   params   — ordered array of variable values for {{1}}, {{2}}, ...
 *   language — optional, defaults to "en"
 */

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

export async function POST(req: NextRequest) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    // Not configured — silently succeed so app still works without WhatsApp
    return NextResponse.json({ success: false, reason: "WhatsApp not configured" }, { status: 200 });
  }

  let body: { to: string; template: string; params: string[]; language?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, template, params = [], language = "en" } = body;
  if (!to || !template) {
    return NextResponse.json({ error: "Missing 'to' or 'template'" }, { status: 400 });
  }

  // Build components from params array
  const components = params.length > 0 ? [
    {
      type: "body",
      parameters: params.map(value => ({ type: "text", text: String(value) })),
    },
  ] : [];

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: language },
      components,
    },
  };

  try {
    const res = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      console.error("[WhatsApp] API error:", data);
      return NextResponse.json({ success: false, error: data }, { status: 200 }); // 200 so caller doesn't throw
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[WhatsApp] Fetch error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 200 });
  }
}
