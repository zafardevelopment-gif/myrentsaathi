/**
 * Generic email sender — fire-and-forget, never throws.
 * Calls /api/email/send internally via fetch.
 */

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    const url = typeof window !== "undefined"
      ? "/api/email/send"
      : `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.myrentsaathi.com"}/api/email/send`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never throw — email failure must not break the main flow
  }
}

const BASE = "https://www.myrentsaathi.com";

const wrap = (content: string) => `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;border-radius:12px">
    <div style="background:#1a1a2e;border-radius:10px;padding:16px 24px;margin-bottom:24px">
      <h1 style="color:#fff;font-size:18px;margin:0">MyRentSaathi</h1>
      <p style="color:#aaa;font-size:11px;margin:4px 0 0">Society Management Platform</p>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#bbb;font-size:11px;text-align:center">
      MyRentSaathi &middot; <a href="${BASE}" style="color:#bbb">${BASE}</a>
    </p>
  </div>`;

// ─── TYPED SENDERS ───────────────────────────────────────────

export async function emailAccountWelcome(params: {
  to: string;
  fullName: string;
  role: "society_admin" | "landlord";
  loginUrl?: string;
}): Promise<void> {
  const { to, fullName, role, loginUrl } = params;
  const roleLabel = role === "society_admin" ? "Society Admin" : "Landlord";
  const dashUrl = loginUrl ?? `${BASE}/login`;
  const nextSteps = role === "landlord"
    ? ["Add your properties / units", "Add tenants & create agreements", "Link your bank account (Razorpay) for auto rent settlement", "Start generating rent / maintenance / electricity invoices"]
    : ["Add flats & residents to your society", "Invite board members", "Link the society bank account", "Start billing maintenance & dues"];
  await sendEmail({
    to,
    subject: `Welcome to MyRentSaathi, ${fullName}! 🎉`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${fullName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Aapka <strong>${roleLabel}</strong> account successfully ban gaya hai. MyRentSaathi mein aapka swagat hai! 🏠
      </p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin:16px 0;font-size:13px">
        <div style="font-weight:700;color:#16a34a;margin-bottom:6px">✓ Account Active</div>
        <div style="color:#555">Login Email: <strong>${to}</strong></div>
      </div>
      <div style="font-size:13px;color:#333;font-weight:700;margin-bottom:8px">Agle steps:</div>
      <ol style="color:#555;font-size:12px;line-height:1.8;padding-left:18px;margin:0 0 16px">
        ${nextSteps.map((s) => `<li>${s}</li>`).join("")}
      </ol>
      <a href="${dashUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-weight:700;font-size:13px">
        Dashboard Kholen →
      </a>
      <p style="color:#888;font-size:11px;margin-top:16px">
        Koi madad chahiye? Hamein support@myrentsaathi.com pe likhein.
      </p>
    `),
  });
}

export async function emailRentHikeNotice(params: {
  to: string;
  tenantName: string;
  flatNumber: string;
  currentRent: number;
  newRent: number;
  effectiveFrom: string;
}): Promise<void> {
  const { to, tenantName, flatNumber, currentRent, newRent, effectiveFrom } = params;
  await sendEmail({
    to,
    subject: `Rent Hike Notice — Flat ${flatNumber}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${tenantName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Aapke flat <strong>${flatNumber}</strong> ka monthly rent badha diya gaya hai.
      </p>
      <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Current Rent</span>
          <span style="color:#333;font-weight:600">₹${currentRent.toLocaleString("en-IN")}/month</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">New Rent</span>
          <span style="color:#e05;font-weight:700">₹${newRent.toLocaleString("en-IN")}/month</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Effective From</span>
          <span style="color:#333;font-weight:600">${effectiveFrom}</span>
        </div>
      </div>
      <p style="color:#555;font-size:12px">Koi sawaal ho to apne landlord ya MyRentSaathi support se sampark karen.</p>
    `),
  });
}

export async function emailNoticeAlert(params: {
  to: string;
  residentName: string;
  societyName: string;
  noticeTitle: string;
  noticeContent: string;
}): Promise<void> {
  const { to, residentName, societyName, noticeTitle, noticeContent } = params;
  await sendEmail({
    to,
    subject: `Society Notice: ${noticeTitle}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${residentName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        <strong>${societyName}</strong> ki taraf se ek naya notice publish kiya gaya hai:
      </p>
      <div style="background:#fffbf0;border:1px solid #f59e0b;border-radius:10px;padding:16px;margin:16px 0">
        <div style="font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:8px">${noticeTitle}</div>
        <div style="font-size:13px;color:#555;line-height:1.6">${noticeContent}</div>
      </div>
      <a href="${BASE}/tenant/notices" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Notice Dekhen →
      </a>
    `),
  });
}

export async function emailMaintenanceDue(params: {
  to: string;
  ownerName: string;
  flatNumber: string;
  shareAmount: number;
  description: string;
  societyName: string;
}): Promise<void> {
  const { to, ownerName, flatNumber, shareAmount, description, societyName } = params;
  await sendEmail({
    to,
    subject: `Maintenance Due — Flat ${flatNumber} | ${societyName}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${ownerName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        <strong>${societyName}</strong> mein ek naya maintenance expense approve hua hai.
        Flat <strong>${flatNumber}</strong> ka share neeche diya gaya hai:
      </p>
      <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Description</span>
          <span style="color:#333;font-weight:600">${description}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Your Share</span>
          <span style="color:#e05;font-weight:700">₹${shareAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <a href="${BASE}/landlord/society-dues" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Payment Karen →
      </a>
    `),
  });
}

export async function emailTicketUpdate(params: {
  to: string;
  raiserName: string;
  ticketNumber: string;
  subject: string;
  newStatus: string;
  societyName: string;
  note?: string;
}): Promise<void> {
  const { to, raiserName, ticketNumber, subject, newStatus, societyName, note } = params;
  const statusLabel: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  await sendEmail({
    to,
    subject: `Ticket #${ticketNumber} Update — ${statusLabel[newStatus] ?? newStatus}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${raiserName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Aapki complaint <strong>${societyName}</strong> mein update hui hai:
      </p>
      <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Ticket #</span>
          <span style="color:#333;font-weight:600">${ticketNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Subject</span>
          <span style="color:#333;font-weight:600">${subject}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0${note ? ";border-bottom:1px solid #eee" : ""}">
          <span style="color:#888">New Status</span>
          <span style="color:#16a34a;font-weight:700">${statusLabel[newStatus] ?? newStatus}</span>
        </div>
        ${note ? `<div style="padding:6px 0"><span style="color:#888">Note: </span><span style="color:#333">${note}</span></div>` : ""}
      </div>
      <a href="${BASE}/landlord/complaints" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Ticket Dekhen →
      </a>
    `),
  });
}

export async function emailVisitorAlert(params: {
  to: string;
  residentName: string;
  flatNumber: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  guardName: string;
  societyName: string;
}): Promise<void> {
  const { to, residentName, flatNumber, visitorName, visitorPhone, purpose, guardName, societyName } = params;
  await sendEmail({
    to,
    subject: `Visitor Alert — Flat ${flatNumber} | ${societyName}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${residentName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Flat <strong>${flatNumber}</strong> ke liye ek visitor aaya hai:
      </p>
      <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Visitor Name</span>
          <span style="color:#333;font-weight:600">${visitorName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Mobile</span>
          <span style="color:#333;font-weight:600">${visitorPhone}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <span style="color:#888">Purpose</span>
          <span style="color:#333;font-weight:600">${purpose || "—"}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Guard</span>
          <span style="color:#333;font-weight:600">${guardName}</span>
        </div>
      </div>
    `),
  });
}

export async function emailPaymentConfirmation(params: {
  to: string;
  fullName: string;
  planName: string;
  amount: number;
  validTill: string;
  paymentId: string;
  planType: string;
}): Promise<void> {
  const { to, fullName, planName, amount, validTill, paymentId, planType } = params;
  await sendEmail({
    to,
    subject: `Payment Confirmed — ${planName} Plan | MyRentSaathi`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Hello <strong>${fullName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Your payment has been successfully received. Your <strong>${planName}</strong> plan is now active!
      </p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Plan</span>
          <span style="color:#333;font-weight:600">${planName} (${planType})</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Amount Paid</span>
          <span style="color:#16a34a;font-weight:700">₹${amount.toLocaleString("en-IN")}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Valid Till</span>
          <span style="color:#333;font-weight:600">${validTill}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Transaction ID</span>
          <span style="color:#333;font-family:monospace;font-size:11px">${paymentId}</span>
        </div>
      </div>
      <a href="${BASE}/${planType === "society" ? "admin" : "landlord"}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Open Dashboard →
      </a>
    `),
  });
}

// ─── INVOICE PAYMENT RECEIPT (tenant ko) ─────────────────────

export async function emailInvoicePaymentReceipt(params: {
  to: string;
  tenantName: string;
  invoiceNumber: string;
  billingPeriod: string | null;
  amountPaid: number;
  paymentDate: string;
  paymentId: string;
  landlordName: string;
  viewUrl: string;
}): Promise<void> {
  const { to, tenantName, invoiceNumber, billingPeriod, amountPaid, paymentDate, paymentId, landlordName, viewUrl } = params;
  await sendEmail({
    to,
    subject: `Payment Receipt — ${invoiceNumber} | MyRentSaathi`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${tenantName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Aapka payment successfully receive ho gaya hai. Neeche receipt ki details hain:
      </p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Invoice No.</span>
          <span style="color:#333;font-weight:600;font-family:monospace">${invoiceNumber}</span>
        </div>
        ${billingPeriod ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Period</span>
          <span style="color:#333;font-weight:600">${billingPeriod}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Amount Paid</span>
          <span style="color:#16a34a;font-weight:700;font-size:15px">₹${amountPaid.toLocaleString("en-IN")}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Payment Date</span>
          <span style="color:#333;font-weight:600">${paymentDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Landlord</span>
          <span style="color:#333;font-weight:600">${landlordName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Transaction ID</span>
          <span style="color:#555;font-family:monospace;font-size:11px">${paymentId}</span>
        </div>
      </div>
      <div style="background:#16a34a;border-radius:8px;padding:12px;text-align:center;margin:16px 0">
        <span style="color:#fff;font-size:18px;font-weight:700">✓ Payment Confirmed</span>
      </div>
      <a href="${viewUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Receipt Dekhen →
      </a>
      <p style="color:#888;font-size:11px;margin-top:16px">Yeh email payment confirmation hai. Koi sawaal ho to apne landlord se sampark karen.</p>
    `),
  });
}

// ─── PAYMENT RECEIVED NOTIFICATION (landlord ko) ─────────────

export async function emailPaymentReceivedLandlord(params: {
  to: string;
  landlordName: string;
  tenantName: string;
  flatNumber: string;
  invoiceNumber: string;
  billingPeriod: string | null;
  amountPaid: number;
  paymentDate: string;
  paymentId: string;
  dashboardUrl: string;
}): Promise<void> {
  const { to, landlordName, tenantName, flatNumber, invoiceNumber, billingPeriod, amountPaid, paymentDate, paymentId, dashboardUrl } = params;
  await sendEmail({
    to,
    subject: `Payment Received — ${invoiceNumber} from ${tenantName}`,
    html: wrap(`
      <p style="color:#333;font-size:15px">Namaste <strong>${landlordName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        <strong>${tenantName}</strong> ne Flat <strong>${flatNumber}</strong> ka payment kar diya hai.
      </p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Invoice No.</span>
          <span style="color:#333;font-weight:600;font-family:monospace">${invoiceNumber}</span>
        </div>
        ${billingPeriod ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Period</span>
          <span style="color:#333;font-weight:600">${billingPeriod}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Flat</span>
          <span style="color:#333;font-weight:600">${flatNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Tenant</span>
          <span style="color:#333;font-weight:600">${tenantName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Amount Received</span>
          <span style="color:#16a34a;font-weight:700;font-size:15px">₹${amountPaid.toLocaleString("en-IN")}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #bbf7d0">
          <span style="color:#888">Payment Date</span>
          <span style="color:#333;font-weight:600">${paymentDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Transaction ID</span>
          <span style="color:#555;font-family:monospace;font-size:11px">${paymentId}</span>
        </div>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Dashboard Dekhen →
      </a>
    `),
  });
}

// ─── INVOICE OVERDUE REMINDER (improved) ─────────────────────

export async function emailInvoiceOverdueReminder(params: {
  to: string;
  tenantName: string;
  invoiceNumber: string;
  invoiceType: string;
  billingPeriod: string | null;
  outstanding: number;
  dueDate: string;
  daysPastDue: number;
  payUrl: string;
  template: "reminder_before" | "reminder_due" | "reminder_after" | "month_end";
}): Promise<void> {
  const { to, tenantName, invoiceNumber, invoiceType, billingPeriod, outstanding, dueDate, daysPastDue, payUrl, template } = params;
  const isOverdue = template === "reminder_after" || template === "month_end";
  const subjectMap = {
    reminder_before: `Upcoming Payment — ${invoiceNumber}`,
    reminder_due: `Payment Due Today — ${invoiceNumber}`,
    reminder_after: `Overdue Payment — ${invoiceNumber} (${daysPastDue} days overdue)`,
    month_end: `Month-end Reminder — ${invoiceNumber}`,
  };
  const headerColor = isOverdue ? "#dc2626" : template === "reminder_due" ? "#f59e0b" : "#1a1a2e";
  const headerText = isOverdue ? "⚠️ Payment Overdue" : template === "reminder_due" ? "📅 Payment Due Today" : "🔔 Payment Reminder";

  await sendEmail({
    to,
    subject: subjectMap[template],
    html: wrap(`
      <div style="background:${headerColor};border-radius:8px;padding:12px 16px;margin-bottom:16px;text-align:center">
        <span style="color:#fff;font-size:15px;font-weight:700">${headerText}</span>
      </div>
      <p style="color:#333;font-size:15px">Namaste <strong>${tenantName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        ${isOverdue
          ? `Aapka invoice <strong>${daysPastDue} din</strong> se overdue hai. Please jaldi se payment karen.`
          : template === "reminder_due"
          ? `Aapka payment aaj due hai. Please abhi payment karen.`
          : `Aapka upcoming payment reminder.`}
      </p>
      <div style="background:#fff8f0;border:1px solid #fcd9b0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Invoice No.</span>
          <span style="color:#333;font-weight:600;font-family:monospace">${invoiceNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Type</span>
          <span style="color:#333;font-weight:600;text-transform:capitalize">${invoiceType}</span>
        </div>
        ${billingPeriod ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Period</span>
          <span style="color:#333;font-weight:600">${billingPeriod}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Due Date</span>
          <span style="color:${isOverdue ? "#dc2626" : "#333"};font-weight:600">${dueDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:#888;font-weight:700">Outstanding Amount</span>
          <span style="color:#c2660a;font-weight:700;font-size:16px">₹${outstanding.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <a href="${payUrl}" style="display:block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700;font-size:15px;margin:16px 0">
        💳 Abhi Pay Karen — ₹${outstanding.toLocaleString("en-IN")}
      </a>
      <p style="color:#888;font-size:11px;text-align:center">
        Agar payment already kar diya hai to is email ko ignore karen. Late payment par late fee lag sakti hai.
      </p>
    `),
  });
}

// ─── AGREEMENT EXPIRY REMINDER ────────────────────────────────

export async function emailAgreementExpiring(params: {
  to: string;
  tenantName: string;
  flatNumber: string;
  endDate: string;
  daysLeft: number;
  landlordName: string;
  dashboardUrl: string;
}): Promise<void> {
  const { to, tenantName, flatNumber, endDate, daysLeft, landlordName, dashboardUrl } = params;
  const urgency = daysLeft <= 7 ? "#dc2626" : daysLeft <= 15 ? "#f59e0b" : "#1a1a2e";
  await sendEmail({
    to,
    subject: `Rent Agreement Expiring in ${daysLeft} Days — Flat ${flatNumber}`,
    html: wrap(`
      <div style="background:${urgency};border-radius:8px;padding:12px 16px;margin-bottom:16px;text-align:center">
        <span style="color:#fff;font-size:15px;font-weight:700">📋 Agreement Expiry Notice</span>
      </div>
      <p style="color:#333;font-size:15px">Namaste <strong>${tenantName}</strong>,</p>
      <p style="color:#555;font-size:13px;line-height:1.6">
        Aapka rent agreement Flat <strong>${flatNumber}</strong> ke liye
        <strong style="color:${urgency}">${daysLeft} din</strong> mein expire ho raha hai.
        Please apne landlord se renewal ke baare mein baat karen.
      </p>
      <div style="background:#fff8f0;border:1px solid #fcd9b0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Flat</span>
          <span style="color:#333;font-weight:600">${flatNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Landlord</span>
          <span style="color:#333;font-weight:600">${landlordName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fcd9b0">
          <span style="color:#888">Agreement Ends</span>
          <span style="color:${urgency};font-weight:700">${endDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0">
          <span style="color:#888">Days Remaining</span>
          <span style="color:${urgency};font-weight:700;font-size:16px">${daysLeft} days</span>
        </div>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">
        Agreement Dekhen →
      </a>
      <p style="color:#888;font-size:11px;margin-top:16px">
        Renewal ke liye apne landlord se sampark karen. Time pe renewal na hone par ghar khali karna pad sakta hai.
      </p>
    `),
  });
}
