import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/platform-config";

type Payload = {
  to: string;
  name: string;
  email: string;
  password: string;
  role: string;
  societyName?: string;
  loginUrl?: string;
  createdByType?: "landlord" | "society";
  createdByName?: string;
  createdByPhone?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as Payload;
  const { to, name, email, password, role, societyName, loginUrl, createdByType, createdByName, createdByPhone } = body;

  if (!to || !name || !email || !password) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const smtp = await getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.password) {
    return NextResponse.json({ success: false, error: "SMTP not configured" });
  }

  const appUrl = loginUrl ?? "https://myrentsaathi.com/login";

  // Who created this account (landlord / society) + their details.
  const roleLower = (role ?? "").toLowerCase();
  const creatorType: "landlord" | "society" | null =
    createdByType ?? (roleLower === "tenant" ? "landlord" : roleLower === "landlord" ? "society" : null);
  const creatorName = createdByName ?? (creatorType === "society" ? societyName : undefined);
  const creatorLine = creatorName
    ? `your ${creatorType === "society" ? "society" : "landlord"} <strong>${creatorName}</strong>${createdByPhone ? ` (${createdByPhone})` : ""} has created your MyRentSaathi account.`
    : `your MyRentSaathi account has been created${societyName ? ` for <strong>${societyName}</strong>` : ""}.`;

  // What the user can do, based on their role.
  const capsByRole: Record<string, string[]> = {
    tenant: [
      "Pay your rent online (UPI / card / netbanking)",
      "View &amp; download rent invoices and receipts",
      "View your rental agreement anytime",
      "Raise complaints and track their status",
      "Read society notices and vote in polls",
      "Pre-approve visitors and manage your documents",
    ],
    landlord: [
      "Manage your properties, tenants and agreements",
      "Collect rent online and track every payment",
      "Generate rent / maintenance / electricity invoices (with GST)",
      "Send automatic payment reminders on email &amp; WhatsApp",
      "Handle complaints, notices and documents in one place",
    ],
  };
  const caps = capsByRole[roleLower] ?? [
    "Access your dashboard",
    "Manage payments and documents",
    "Stay updated with notices and alerts",
  ];
  const capabilitiesHtml = `
    <div style="background:#f0f7ff;border:1px solid #d7e7fb;border-radius:10px;padding:16px 18px;margin:20px 0">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:8px">✨ What you can do on MyRentSaathi</div>
      <ul style="margin:0;padding-left:18px;color:#555;font-size:12.5px;line-height:1.7">
        ${caps.map((c) => `<li>${c}</li>`).join("")}
      </ul>
    </div>`;

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });

    await transporter.sendMail({
      from: `"${smtp.fromName || "MyRentSaathi"}" <${smtp.fromEmail || smtp.user}>`,
      to: `"${name}" <${to}>`,
      subject: `🔑 Your MyRentSaathi Login Credentials`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;border-radius:12px">
          <div style="background:#1a1a2e;border-radius:10px;padding:20px 24px;margin-bottom:24px">
            <h1 style="color:#fff;font-size:20px;margin:0">MyRentSaathi</h1>
            <p style="color:#aaa;font-size:12px;margin:4px 0 0">Society Management Platform</p>
          </div>

          <p style="color:#555;font-size:14px;line-height:1.6;margin-top:0">
            <strong style="color:#1a1a2e">${name}</strong>, ${creatorLine} Below are your login credentials:
          </p>

          <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr>
                <td style="color:#888;padding:6px 0;width:40%">Role</td>
                <td style="color:#1a1a2e;font-weight:600;padding:6px 0">${role}</td>
              </tr>
              <tr>
                <td style="color:#888;padding:6px 0">Email / Username</td>
                <td style="color:#1a1a2e;font-weight:600;font-family:monospace;padding:6px 0">${email}</td>
              </tr>
              <tr>
                <td style="color:#888;padding:6px 0">Password</td>
                <td style="color:#1a1a2e;font-weight:600;font-family:monospace;padding:6px 0">${password}</td>
              </tr>
            </table>
          </div>

          <a href="${appUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;margin-bottom:8px">
            Log In →
          </a>

          ${capabilitiesHtml}

          <p style="color:#e05;font-size:12px;background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:12px;margin-top:16px">
            ⚠️ <strong>Security tip:</strong> Please change your password after your first login.
            Do not share these credentials with anyone.
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#bbb;font-size:11px;text-align:center">
            MyRentSaathi · If you have any issues, email support@myrentsaathi.com
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) });
  }
}
