import { NextRequest, NextResponse } from "next/server";
import { getWhatsappCreds } from "@/lib/platform-config";

// This sends the "user_credentials_sent" Meta template via WhatsApp.
// Template must be approved in Meta Business Manager with these params:
//   {{1}} = recipient name
//   {{2}} = login email
//   Template name: user_credentials_sent
// WhatsApp message example:
//   "Dear {{1}}, your MyRentSaathi account has been set up. Account details have been sent to {{2}}. Please check your inbox and spam folder."

type Payload = {
  phone: string;
  name: string;
  email: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as Payload;
  const { phone, name, email } = body;

  if (!phone || !name || !email) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const { accessToken, phoneNumberId } = await getWhatsappCreds();
  if (!accessToken || !phoneNumberId) {
    return NextResponse.json({ success: false, reason: "WhatsApp not configured" });
  }

  const digits = phone.replace(/[^0-9]/g, "");
  const to = digits.startsWith("91") ? digits : `91${digits}`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "user_credentials_sent",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: email },
          ],
        },
      ],
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
      return NextResponse.json({ success: false, error: data });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
