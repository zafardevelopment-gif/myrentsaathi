import { NextRequest, NextResponse } from "next/server";
import { getWhatsappCreds } from "@/lib/platform-config";

export async function POST(req: NextRequest) {
  const { accessToken, phoneNumberId } = await getWhatsappCreds();

  if (!accessToken || !phoneNumberId) {
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
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      console.error("[WhatsApp] API error:", data);
      return NextResponse.json({ success: false, error: data }, { status: 200 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[WhatsApp] Fetch error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 200 });
  }
}
