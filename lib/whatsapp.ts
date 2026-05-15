/**
 * WhatsApp helper — sends Meta Cloud API template messages.
 * Call from client pages via fetch("/api/whatsapp/send").
 * The API route silently no-ops if env vars are not set.
 */

/** Convert any phone number to E.164 format (+91XXXXXXXXXX for India) */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("+")) return phone.replace(/\s/g, "");
  return `+${digits}`;
}

/** Get first name from full name */
function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

/** Low-level send — calls our own API route */
async function sendTemplate(
  phone: string,
  template: string,
  params: string[],
): Promise<void> {
  const to = toE164(phone);
  if (!to || to.length < 10) return; // skip invalid phones silently
  try {
    // Works from both client (relative URL) and server (absolute URL needed)
    const url = typeof window !== "undefined"
      ? "/api/whatsapp/send"
      : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/whatsapp/send`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, template, params }),
    });
  } catch {
    // Never throw — WhatsApp failure must not break the main flow
  }
}

// ─── TEMPLATE SENDERS ────────────────────────────────────────

/**
 * mrs_welcome — sent when a new tenant or landlord is created.
 *
 * {{1}} Society name
 * {{2}} User first name
 * {{3}} Login URL
 * {{4}} Login email
 * {{5}} Role-based capability description
 */
export async function sendWelcomeMessage(params: {
  phone: string;
  fullName: string;
  role: "tenant" | "landlord" | "guard";
  societyName: string;
  loginEmail: string;
  loginUrl?: string;
}): Promise<void> {
  const roleDesc: Record<string, string> = {
    tenant:   "✅ Pay rent online · 📋 Raise complaints · 📢 Read notices · 🚗 Parking details",
    landlord: "✅ Manage properties · 💰 Track rent · 🏢 Pay society dues · 📜 Digital agreements",
    guard:    "🚪 Gate entry · ✅ Approve visitors · 🅿️ Verify vehicles",
  };
  await sendTemplate(params.phone, "mrs_welcome", [
    params.societyName,
    firstName(params.fullName),
    params.loginUrl ?? "https://myrentsaathi.com/login",
    params.loginEmail,
    roleDesc[params.role] ?? roleDesc.tenant,
  ]);
}

/**
 * mrs_visitor_alert — sent to flat resident when a visitor arrives at gate.
 *
 * {{1}} Resident first name
 * {{2}} Flat number
 * {{3}} Visitor name
 * {{4}} Visitor phone
 * {{5}} Visit purpose
 * {{6}} Check-in time
 * {{7}} Guard name
 * {{8}} Society name
 */
export async function sendVisitorAlert(params: {
  residentPhone: string;
  residentName: string;
  flatNumber: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  guardName: string;
  societyName: string;
}): Promise<void> {
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  await sendTemplate(params.residentPhone, "mrs_visitor_alert", [
    firstName(params.residentName),
    params.flatNumber,
    params.visitorName,
    params.visitorPhone || "—",
    params.purpose || "Visit",
    timeStr,
    params.guardName,
    params.societyName,
  ]);
}

/**
 * mrs_ticket_update — sent to ticket raiser when status changes.
 *
 * {{1}} Resident first name
 * {{2}} Ticket ID
 * {{3}} Issue title
 * {{4}} New status
 * {{5}} Admin note
 * {{6}} Status description line
 * {{7}} App link
 * {{8}} Society name
 */
export async function sendTicketUpdate(params: {
  raiserPhone: string;
  raiserName: string;
  ticketNumber: string;
  subject: string;
  newStatus: string;
  note?: string;
  societyName: string;
  role?: "tenant" | "landlord";
}): Promise<void> {
  const statusLabels: Record<string, string> = {
    open:        "🟡 Open",
    in_progress: "⚙️ In Progress",
    resolved:    "✅ Resolved",
    closed:      "🔒 Closed",
  };
  const statusLines: Record<string, string> = {
    in_progress: "⚙️ We are working on it.",
    resolved:    "✅ Resolved — Thank you for your patience!",
    closed:      "🔒 This ticket has been closed.",
    open:        "🟡 Your ticket is open.",
  };
  const appLink = params.role === "landlord"
    ? "https://myrentsaathi.com/landlord/complaints"
    : "https://myrentsaathi.com/tenant/complaints";
  await sendTemplate(params.raiserPhone, "mrs_ticket_update", [
    firstName(params.raiserName),
    params.ticketNumber,
    params.subject,
    statusLabels[params.newStatus] ?? params.newStatus,
    params.note || "No additional notes.",
    statusLines[params.newStatus] ?? "",
    appLink,
    params.societyName,
  ]);
}

/**
 * mrs_notice_alert — sent to residents when a new notice is posted.
 *
 * {{1}} Resident first name
 * {{2}} Society / poster name
 * {{3}} Notice title
 * {{4}} First 100 chars of content
 * {{5}} Posted date
 * {{6}} App link
 * {{7}} Society name
 */
export async function sendNoticeAlert(params: {
  residentPhone: string;
  residentName: string;
  societyName: string;
  noticeTitle: string;
  noticeContent: string;
  role?: "tenant" | "landlord";
}): Promise<void> {
  const snippet = params.noticeContent.slice(0, 100) + (params.noticeContent.length > 100 ? "…" : "");
  const postedDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const appLink = params.role === "landlord"
    ? "https://myrentsaathi.com/landlord/notices"
    : "https://myrentsaathi.com/tenant/notices";
  await sendTemplate(params.residentPhone, "mrs_notice_alert", [
    firstName(params.residentName),
    params.societyName,
    params.noticeTitle,
    snippet,
    postedDate,
    appLink,
    params.societyName,
  ]);
}

/**
 * mrs_maintenance_due — sent to landlords/residents when society expense is approved.
 *
 * {{1}} Resident first name
 * {{2}} Month
 * {{3}} Their share amount
 * {{4}} Flat number
 * {{5}} Pay-by date
 * {{6}} What it covers
 * {{7}} App link
 * {{8}} Society name
 */
export async function sendMaintenanceDue(params: {
  residentPhone: string;
  residentName: string;
  flatNumber: string;
  shareAmount: number;
  description: string;
  societyName: string;
  dueDay?: number | null;
}): Promise<void> {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const dueDate = params.dueDay
    ? `${params.dueDay}th ${monthLabel}`
    : `15th ${monthLabel}`;
  await sendTemplate(params.residentPhone, "mrs_maintenance_due", [
    firstName(params.residentName),
    monthLabel,
    params.shareAmount.toLocaleString("en-IN"),
    params.flatNumber,
    dueDate,
    params.description || "Society maintenance charges",
    "https://myrentsaathi.com/landlord/society-dues",
    params.societyName,
  ]);
}

/**
 * mrs_rent_due — rent reminder for a tenant.
 *
 * {{1}} Tenant first name
 * {{2}} Month + Year
 * {{3}} Rent amount
 * {{4}} Due date
 * {{5}} Flat number
 * {{6}} App link
 */
export async function sendRentDueReminder(params: {
  phone: string;
  fullName: string;
  monthYear: string; // "YYYY-MM"
  amount: number;
  flatNumber: string;
}): Promise<void> {
  const monthLabel = new Date(params.monthYear + "-01")
    .toLocaleString("en-IN", { month: "long", year: "numeric" });
  const dueDate = `5th ${monthLabel}`;
  const formattedAmount = params.amount.toLocaleString("en-IN");
  await sendTemplate(params.phone, "mrs_rent_due", [
    firstName(params.fullName),
    monthLabel,
    formattedAmount,
    dueDate,
    params.flatNumber,
    "https://myrentsaathi.com/tenant/payments",
  ]);
}

/**
 * mrs_payment_confirmation — sent after successful subscription payment.
 *
 * {{1}} User first name
 * {{2}} Plan name (e.g. "Pro")
 * {{3}} Amount paid (e.g. "₹99")
 * {{4}} Plan valid till date
 * {{5}} Payment ID
 * {{6}} Dashboard link
 */
export async function sendPaymentConfirmation(params: {
  phone: string;
  fullName: string;
  planName: string;
  amount: number;
  validTill: string; // human readable e.g. "15 Jun 2026"
  paymentId: string;
  planType: "society" | "landlord";
}): Promise<void> {
  const dashboardLink = params.planType === "society"
    ? "https://myrentsaathi.com/admin"
    : "https://myrentsaathi.com/landlord";
  await sendTemplate(params.phone, "mrs_payment_confirmation", [
    firstName(params.fullName),
    params.planName,
    `₹${params.amount.toLocaleString("en-IN")}`,
    params.validTill,
    params.paymentId,
    dashboardLink,
  ]);
}
