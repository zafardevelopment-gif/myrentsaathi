import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/platform-config";

type Payload = {
  to: string;
  subject: string;
  html: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as Payload;
  const { to, subject, html } = body;

  if (!to || !subject || !html) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const smtp = await getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.password) {
    return NextResponse.json({ success: false, error: "SMTP not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });

    await transporter.sendMail({
      from: `"${smtp.fromName || "MyRentSaathi"}" <${smtp.fromEmail || smtp.user}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
