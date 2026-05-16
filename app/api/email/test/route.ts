import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/platform-config";

export async function POST(req: NextRequest) {
  const { to } = await req.json() as { to: string };
  if (!to) return NextResponse.json({ success: false, error: "Missing 'to'" }, { status: 400 });

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
      subject: "✅ MyRentSaathi — SMTP Test Email",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1a2e;margin-bottom:8px">SMTP Connection Successful</h2>
          <p style="color:#555;font-size:14px">
            Yeh test email MyRentSaathi platform se successfully deliver hua hai.<br/>
            Aapka SMTP configuration sahi hai.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#999;font-size:11px">MyRentSaathi Platform · Super Admin Email Test</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
