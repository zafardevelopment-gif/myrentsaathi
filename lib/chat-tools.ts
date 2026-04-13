/**
 * Saathi — Full Customer Support Agent Tools
 * Covers: pricing, onboarding, user account data, society ops, admin analytics,
 * complaints, parking, notices, visitors, staff, and human escalation.
 * Role-gated where needed. No sensitive data leaked.
 */

import { supabase } from "./supabase";

// ─── TYPES ──────────────────────────────────────────────────

export interface ChatUserContext {
  userId?: string;
  role?: string;
  name?: string;
  email?: string;
  societyId?: string;
}

// ─── HELPER ──────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return "N/A";
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "N/A";
  return d.slice(0, 10);
}

// ─── TOOL: getUserDashboard ──────────────────────────────────
// Returns the logged-in user's personal summary: flat, society, dues status

export async function getUserDashboard(userId: string, role: string) {
  if (!userId) return { error: "Not logged in." };

  // Fetch base user
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role")
    .eq("id", userId)
    .single();

  if (!user) return { error: "User not found." };

  const result: Record<string, unknown> = {
    name: user.full_name,
    email: user.email,
    phone: user.phone,
    role,
  };

  if (role === "tenant") {
    // Find active tenancy
    const { data: tenancy } = await supabase
      .from("tenants")
      .select("flat_id, lease_start, lease_end, society_id, flat:flats(flat_number, block, floor_number, monthly_rent, flat_type)")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (tenancy) {
      const flat = tenancy.flat as unknown as { flat_number: string; block: string | null; floor_number: number | null; monthly_rent: number | null; flat_type: string | null } | null;
      result.flat = flat?.flat_number ?? "N/A";
      result.block = flat?.block ?? "";
      result.flat_type = flat?.flat_type ?? "";
      result.monthly_rent = fmt(flat?.monthly_rent);
      result.lease_start = fmtDate(tenancy.lease_start);
      result.lease_end = fmtDate(tenancy.lease_end);

      // Society
      const { data: society } = await supabase
        .from("societies")
        .select("name, city, address")
        .eq("id", tenancy.society_id)
        .single();
      result.society = society?.name ?? "";
      result.city = society?.city ?? "";

      // Pending dues
      const { data: dues } = await supabase
        .from("maintenance_payments")
        .select("month_year, amount, status")
        .eq("flat_id", tenancy.flat_id)
        .in("status", ["pending", "overdue"])
        .order("month_year", { ascending: false })
        .limit(3);

      result.pending_dues = (dues ?? []).map((d) => ({
        month: d.month_year,
        amount: fmt(d.amount),
        status: d.status,
      }));
      result.total_pending = fmt((dues ?? []).reduce((s, d) => s + (d.amount ?? 0), 0));
    }
  } else if (role === "landlord") {
    // Landlord flats
    const { data: flats } = await supabase
      .from("flats")
      .select("flat_number, block, status, monthly_rent, flat_type, society_id")
      .eq("owner_id", userId)
      .limit(10);

    result.total_properties = flats?.length ?? 0;
    result.properties = (flats ?? []).map((f) => ({
      flat: f.flat_number,
      block: f.block,
      type: f.flat_type,
      rent: fmt(f.monthly_rent),
      status: f.status,
    }));

    if (flats && flats.length > 0) {
      const { data: society } = await supabase
        .from("societies")
        .select("name, city")
        .eq("id", flats[0].society_id)
        .single();
      result.society = society?.name ?? "";
    }
  } else if (role === "admin") {
    // Admin society overview
    const { data: membership } = await supabase
      .from("society_members")
      .select("society_id")
      .eq("user_id", userId)
      .in("role", ["admin", "board", "board_member"])
      .single();

    if (membership) {
      const { data: society } = await supabase
        .from("societies")
        .select("name, city, total_flats, subscription_plan, is_active")
        .eq("id", membership.society_id)
        .single();

      result.society = society?.name ?? "";
      result.city = society?.city ?? "";
      result.total_flats = society?.total_flats ?? 0;
      result.plan = society?.subscription_plan ?? "";
      result.society_id = membership.society_id;

      // Quick stats
      const [{ count: occupied }, { count: vehicles }, { count: openTickets }] = await Promise.all([
        supabase.from("flats").select("id", { count: "exact", head: true }).eq("society_id", membership.society_id).eq("status", "occupied"),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("society_id", membership.society_id).eq("status", "active"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("society_id", membership.society_id).in("status", ["open", "assigned"]),
      ]);
      result.occupied_flats = occupied ?? 0;
      result.active_vehicles = vehicles ?? 0;
      result.open_tickets = openTickets ?? 0;
    }
  }

  return result;
}

// ─── TOOL: getMaintenanceDues ────────────────────────────────
// Returns maintenance payment history for the user's flat

export async function getMaintenanceDues(userId: string, role: string, months: number = 6) {
  if (!userId) return { error: "Not logged in." };

  let flatId: string | null = null;

  if (role === "tenant") {
    const { data } = await supabase
      .from("tenants")
      .select("flat_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    flatId = data?.flat_id ?? null;
  } else if (role === "landlord") {
    const { data } = await supabase
      .from("flats")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .single();
    flatId = data?.id ?? null;
  }

  if (!flatId) return { error: "No flat found for your account." };

  const { data: payments } = await supabase
    .from("maintenance_payments")
    .select("month_year, amount, expected_amount, status, payment_date, payment_method")
    .eq("flat_id", flatId)
    .order("month_year", { ascending: false })
    .limit(months);

  const total_paid = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const total_pending = (payments ?? []).filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  return {
    records: (payments ?? []).map((p) => ({
      month: p.month_year,
      amount: fmt(p.amount),
      expected: fmt(p.expected_amount),
      status: p.status,
      paid_on: fmtDate(p.payment_date),
      method: p.payment_method ?? "",
    })),
    summary: {
      total_paid: fmt(total_paid),
      total_pending: fmt(total_pending),
      last_months: months,
    },
  };
}

// ─── TOOL: getMyComplaints ────────────────────────────────────
// Returns tickets raised by this user + can show how to raise new one

export async function getMyComplaints(userId: string) {
  if (!userId) return { error: "Not logged in." };

  const { data: tickets } = await supabase
    .from("tickets")
    .select("ticket_number, category, subject, priority, status, created_at, resolved_at, flat:flats(flat_number)")
    .eq("raised_by", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    total: tickets?.length ?? 0,
    complaints: (tickets ?? []).map((t) => ({
      ticket: t.ticket_number ?? t.subject?.slice(0, 20),
      category: t.category,
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      raised_on: fmtDate(t.created_at),
      resolved_on: fmtDate(t.resolved_at),
    })),
    how_to_raise: "Go to your dashboard → Tickets / Complaints → click '+ New Ticket'. Select category, describe the issue, and submit. The society admin will be notified immediately.",
  };
}

// ─── TOOL: getSocietyNotices ──────────────────────────────────
// Returns recent notices for the user's society

export async function getSocietyNotices(userId: string, role: string) {
  if (!userId) return { error: "Not logged in." };

  let societyId: string | null = null;

  if (role === "tenant") {
    const { data } = await supabase.from("tenants").select("society_id").eq("user_id", userId).eq("status", "active").single();
    societyId = data?.society_id ?? null;
  } else if (role === "landlord") {
    const { data } = await supabase.from("flats").select("society_id").eq("owner_id", userId).limit(1).single();
    societyId = data?.society_id ?? null;
  } else if (role === "admin") {
    const { data } = await supabase.from("society_members").select("society_id").eq("user_id", userId).in("role", ["admin", "board", "board_member"]).single();
    societyId = data?.society_id ?? null;
  }

  if (!societyId) return { error: "Could not find your society." };

  const { data: notices } = await supabase
    .from("notices")
    .select("title, content, notice_type, audience, created_at")
    .eq("society_id", societyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    total: notices?.length ?? 0,
    notices: (notices ?? []).map((n) => ({
      title: n.title,
      type: n.notice_type,
      audience: n.audience,
      date: fmtDate(n.created_at),
      content: n.content?.slice(0, 200),
    })),
  };
}

// ─── TOOL: getMyVehicles ──────────────────────────────────────
// Returns registered vehicles + parking slot assignment

export async function getMyVehicles(userId: string) {
  if (!userId) return { error: "Not logged in." };

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, vehicle_number, vehicle_type, vehicle_model, color, flat_number, is_authorized")
    .eq("owner_id", userId)
    .eq("status", "active");

  if (!vehicles || vehicles.length === 0) return { vehicles: [], message: "No vehicles registered to your account. To register a vehicle, ask your society admin or go to your dashboard → Parking." };

  const { data: fullPasses } = await supabase
    .from("vehicle_parking_passes")
    .select("vehicle_id, slot:slot_id(slot_number, slot_type, level)")
    .in("vehicle_id", vehicles.map((v) => v.id))
    .eq("is_active", true);

  const fullPassMap: Record<string, { slot_number: string; slot_type: string; level: string | null }> = {};
  for (const p of fullPasses ?? []) {
    fullPassMap[p.vehicle_id] = p.slot as unknown as { slot_number: string; slot_type: string; level: string | null };
  }

  return {
    vehicles: (vehicles ?? []).map((v) => ({
      number: v.vehicle_number,
      type: v.vehicle_type,
      model: v.vehicle_model ?? "",
      color: v.color ?? "",
      flat: v.flat_number ?? "",
      authorized: v.is_authorized ? "Yes" : "No",
      assigned_slot: fullPassMap[v.id]?.slot_number ?? "Not assigned",
      slot_level: fullPassMap[v.id]?.level ?? "",
    })),
  };
}

// ─── TOOL: getVisitorLog ──────────────────────────────────────
// Returns recent visitor entries for the user's flat or society

export async function getVisitorLog(userId: string, role: string) {
  if (!userId) return { error: "Not logged in." };

  if (role === "admin") {
    // Admin sees all
    const { data: membership } = await supabase
      .from("society_members")
      .select("society_id")
      .eq("user_id", userId)
      .in("role", ["admin", "board", "board_member"])
      .single();

    if (!membership) return { error: "Admin society not found." };

    const { data } = await supabase
      .from("visitor_logs")
      .select("visitor_name, visitor_mobile, purpose, flat_number, check_in_time, check_out_time")
      .eq("society_id", membership.society_id)
      .order("check_in_time", { ascending: false })
      .limit(10);

    return {
      visitors: (data ?? []).map((v) => ({
        name: v.visitor_name,
        mobile: v.visitor_mobile ?? "",
        purpose: v.purpose ?? "",
        flat: v.flat_number ?? "",
        in: fmtDate(v.check_in_time),
        out: fmtDate(v.check_out_time),
      })),
    };
  }

  // Tenant/landlord sees their flat's visitors
  let flatNumber: string | null = null;
  if (role === "tenant") {
    const { data } = await supabase.from("tenants").select("flat:flat_id(flat_number)").eq("user_id", userId).eq("status", "active").single();
    flatNumber = (data?.flat as unknown as { flat_number: string } | null)?.flat_number ?? null;
  } else if (role === "landlord") {
    const { data } = await supabase.from("flats").select("flat_number").eq("owner_id", userId).limit(1).single();
    flatNumber = data?.flat_number ?? null;
  }

  if (!flatNumber) return { error: "Flat not found." };

  const { data } = await supabase
    .from("visitor_logs")
    .select("visitor_name, visitor_mobile, purpose, check_in_time, check_out_time")
    .eq("flat_number", flatNumber)
    .order("check_in_time", { ascending: false })
    .limit(10);

  return {
    flat: flatNumber,
    visitors: (data ?? []).map((v) => ({
      name: v.visitor_name,
      mobile: v.visitor_mobile ?? "",
      purpose: v.purpose ?? "",
      in: fmtDate(v.check_in_time),
      out: fmtDate(v.check_out_time),
    })),
  };
}

// ─── TOOL: getSocietyStaff ───────────────────────────────────
// Returns society staff directory (name, role, mobile)

export async function getSocietyStaff(userId: string, role: string) {
  if (!userId) return { error: "Not logged in." };

  let societyId: string | null = null;
  if (role === "tenant") {
    const { data } = await supabase.from("tenants").select("society_id").eq("user_id", userId).eq("status", "active").single();
    societyId = data?.society_id ?? null;
  } else if (role === "landlord") {
    const { data } = await supabase.from("flats").select("society_id").eq("owner_id", userId).limit(1).single();
    societyId = data?.society_id ?? null;
  } else if (role === "admin") {
    const { data } = await supabase.from("society_members").select("society_id").eq("user_id", userId).in("role", ["admin", "board", "board_member"]).single();
    societyId = data?.society_id ?? null;
  }

  if (!societyId) return { error: "Society not found." };

  const { data: staff } = await supabase
    .from("staff")
    .select("full_name, role, mobile, is_active")
    .eq("society_id", societyId)
    .eq("is_active", true)
    .order("role");

  return {
    count: staff?.length ?? 0,
    staff: (staff ?? []).map((s) => ({
      name: s.full_name,
      role: s.role,
      mobile: s.mobile,
    })),
  };
}

// ─── TOOL: getAdminFinancialSummary ──────────────────────────
// Admin-only: income vs expense summary for current month + YTD

export async function getAdminFinancialSummary(userId: string) {
  const { data: membership } = await supabase
    .from("society_members")
    .select("society_id")
    .eq("user_id", userId)
    .in("role", ["admin", "board", "board_member"])
    .single();

  if (!membership) return { error: "Admin access required." };
  const sid = membership.society_id;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [
    { data: paidThis },
    { data: pendingThis },
    { data: expensesThis },
    { data: paidYTD },
    { data: expensesYTD },
  ] = await Promise.all([
    supabase.from("maintenance_payments").select("amount").eq("society_id", sid).eq("month_year", currentMonth).eq("status", "paid"),
    supabase.from("maintenance_payments").select("amount").eq("society_id", sid).eq("month_year", currentMonth).in("status", ["pending", "overdue"]),
    supabase.from("society_expenses").select("amount, category").eq("society_id", sid).gte("expense_date", `${currentMonth}-01`),
    supabase.from("maintenance_payments").select("amount").eq("society_id", sid).gte("month_year", `${new Date().getFullYear()}-01`).eq("status", "paid"),
    supabase.from("society_expenses").select("amount").eq("society_id", sid).gte("expense_date", `${new Date().getFullYear()}-01-01`),
  ]);

  const sum = (arr: { amount: number }[] | null) => (arr ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

  // Expense breakdown by category this month
  const catMap: Record<string, number> = {};
  for (const e of expensesThis ?? []) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
  }

  return {
    this_month: {
      month: currentMonth,
      income_collected: fmt(sum(paidThis)),
      income_pending: fmt(sum(pendingThis)),
      total_expenses: fmt(sum(expensesThis)),
      net: fmt(sum(paidThis) - sum(expensesThis)),
      expense_breakdown: Object.entries(catMap).map(([cat, amt]) => ({ category: cat, amount: fmt(amt) })),
    },
    year_to_date: {
      total_income: fmt(sum(paidYTD)),
      total_expenses: fmt(sum(expensesYTD)),
      net: fmt(sum(paidYTD) - sum(expensesYTD)),
    },
  };
}

// ─── TOOL: getSocietyOccupancy ───────────────────────────────
// Admin-only: flat occupancy, vacant flats, vehicle stats

export async function getSocietyOccupancy(userId: string) {
  const { data: membership } = await supabase
    .from("society_members")
    .select("society_id")
    .eq("user_id", userId)
    .in("role", ["admin", "board", "board_member"])
    .single();

  if (!membership) return { error: "Admin access required." };
  const sid = membership.society_id;

  const [
    { data: allFlats },
    { count: vehicles },
    { count: authorizedVehicles },
    { count: parkingOccupied },
  ] = await Promise.all([
    supabase.from("flats").select("flat_number, block, status, flat_type, floor_number, monthly_rent").eq("society_id", sid).order("flat_number"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("society_id", sid).eq("status", "active"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("society_id", sid).eq("status", "active").eq("is_authorized", true),
    supabase.from("parking_slots").select("id", { count: "exact", head: true }).eq("society_id", sid).eq("status", "occupied"),
  ]);

  const flats = allFlats ?? [];
  const occupied = flats.filter((f) => f.status === "occupied");
  const vacant = flats.filter((f) => f.status !== "occupied");

  return {
    total_flats: flats.length,
    occupied: occupied.length,
    vacant: vacant.length,
    occupancy_rate: flats.length > 0 ? `${Math.round((occupied.length / flats.length) * 100)}%` : "0%",
    vacant_flats: vacant.slice(0, 10).map((f) => ({
      flat: f.flat_number,
      block: f.block ?? "",
      type: f.flat_type ?? "",
      floor: f.floor_number ?? "",
      rent: fmt(f.monthly_rent),
    })),
    vehicles: {
      total: vehicles ?? 0,
      authorized: authorizedVehicles ?? 0,
      parking_slots_occupied: parkingOccupied ?? 0,
    },
  };
}

// ─── TOOL: howToGuide ────────────────────────────────────────
// Step-by-step guide for any feature of the platform

export function howToGuide(topic: string): { title: string; steps: string[]; tips?: string[] } {
  const t = topic.toLowerCase();

  if (t.includes("pay") && (t.includes("maintenance") || t.includes("rent") || t.includes("due"))) {
    return {
      title: "How to Pay Maintenance / Rent",
      steps: [
        "Log in to your MyRentSaathi account",
        "Go to Dashboard → click on 'Pay Dues' or 'Maintenance'",
        "Select the month/amount to pay",
        "Choose payment method: UPI, card, net banking, or bank transfer",
        "Complete payment — you'll get a WhatsApp/email receipt instantly",
      ],
      tips: ["Payments are reflected within minutes", "Download receipt from Payments history"],
    };
  }
  if (t.includes("complaint") || t.includes("ticket") || t.includes("issue")) {
    return {
      title: "How to Raise a Complaint",
      steps: [
        "Go to your Dashboard → 'Tickets' or 'Complaints'",
        "Click '+ New Ticket'",
        "Select the category (Maintenance, Cleanliness, Security, etc.)",
        "Describe your issue in detail",
        "Set priority (Low / Medium / High)",
        "Submit — society admin is notified immediately",
        "Track status: Open → Assigned → Resolved",
      ],
    };
  }
  if (t.includes("parking") || t.includes("vehicle") || t.includes("car") || t.includes("bike")) {
    return {
      title: "How to Register Vehicle / Get Parking",
      steps: [
        "Go to Dashboard → Parking",
        "Click '+ Register Vehicle'",
        "Enter vehicle number, type (Car/Bike), model, and color",
        "Your society admin will review and assign a parking slot",
        "Once approved, your vehicle is listed as 'Authorized'",
        "Print your parking pass from the Parking tab",
      ],
      tips: ["Vehicle registration requires admin approval", "Contact admin if your vehicle shows 'Unauthorized'"],
    };
  }
  if (t.includes("visitor") || t.includes("guest") || t.includes("entry")) {
    return {
      title: "How Visitor Entry Works",
      steps: [
        "Visitor arrives at the gate and gives their name + purpose",
        "Guard enters details in MyRentSaathi visitor log",
        "You receive a WhatsApp notification about the visitor",
        "Guard approves entry after your confirmation",
        "Check-out is logged when visitor leaves",
        "View all visitor history in Dashboard → Visitors",
      ],
    };
  }
  if (t.includes("notice")) {
    return {
      title: "How to View / Post Notices",
      steps: [
        "Residents: Go to Dashboard → Notices to view all society notices",
        "Admin: Go to Admin Panel → Notices → click '+ New Notice'",
        "Set the notice title, content, type (General/Urgent/Meeting/etc.)",
        "Choose audience (All / Landlords / Tenants / Board)",
        "Post — all targeted residents are notified via WhatsApp",
      ],
    };
  }
  if (t.includes("poll") || t.includes("vot")) {
    return {
      title: "How to Participate in Polls",
      steps: [
        "Go to Dashboard → Polls",
        "Active polls are listed with their end dates",
        "Click on a poll to see options",
        "Select your choice and submit your vote",
        "Results are visible after voting or after poll closes",
      ],
      tips: ["Each resident can vote only once", "Admin creates polls from Admin Panel → Polls"],
    };
  }
  if (t.includes("document") || t.includes("noc") || t.includes("agreement") || t.includes("noc")) {
    return {
      title: "How to Access Documents",
      steps: [
        "Go to Dashboard → Documents",
        "Society documents (by-laws, circulars) are listed here",
        "Landlords can generate rent agreements under Properties → Agreements",
        "For NOC, raise a request via Tickets or contact admin",
        "Download any document as PDF directly from the platform",
      ],
    };
  }
  if (t.includes("password") || t.includes("login") || t.includes("account")) {
    return {
      title: "Account & Login Help",
      steps: [
        "Go to myrentsaathi.com and click 'Login'",
        "Enter your registered email and password",
        "Forgot password? Click 'Forgot Password' on login page",
        "A reset link will be sent to your email within 1 minute",
        "If you can't access your email, contact support for manual reset",
      ],
      tips: ["Use the same email your landlord/admin registered you with"],
    };
  }

  // Default guide
  return {
    title: `Guide: ${topic}`,
    steps: [
      "Log in to MyRentSaathi (myrentsaathi.com)",
      "Navigate to the relevant section from your dashboard",
      "Look for action buttons (+ Add, Edit, etc.) for the task",
      "If you're stuck, use the search or contact support",
    ],
    tips: ["If you need specific help, I can create a support ticket for you"],
  };
}

// ─── TOOL: getPricingPlans ───────────────────────────────────

export async function getPricingPlans() {
  const { data, error } = await supabase
    .from("pricing_plans")
    .select(`id, name, category, price_monthly, price_yearly, description, is_popular, is_active, pricing_features(feature_text, is_included)`)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return {
      plans: [
        { name: "Starter",    category: "society",  price_monthly: 2999, description: "Up to 50 flats",       features: ["50 flats", "Rent collection", "Maintenance", "WhatsApp alerts"] },
        { name: "Growth",     category: "society",  price_monthly: 5999, description: "Up to 200 flats",      features: ["200 flats", "Everything in Starter", "Documents", "Polls", "Priority support"] },
        { name: "Enterprise", category: "society",  price_monthly: 9999, description: "Unlimited flats",      features: ["Unlimited flats", "Custom branding", "Dedicated manager"] },
        { name: "Basic",      category: "landlord", price_monthly: 499,  description: "Up to 5 properties",   features: ["5 properties", "Rent tracking", "Tenant mgmt"] },
        { name: "Pro",        category: "landlord", price_monthly: 999,  description: "Up to 20 properties",  features: ["20 properties", "Agreement generation", "WhatsApp automation"] },
        { name: "NRI",        category: "landlord", price_monthly: 1999, description: "NRI remote management",features: ["Unlimited properties", "Tax reports", "NRI support"] },
      ],
    };
  }

  return {
    plans: data.map((p) => ({
      name: p.name, category: p.category, price_monthly: p.price_monthly,
      price_yearly: p.price_yearly, description: p.description, is_popular: p.is_popular,
      features: (p.pricing_features as { feature_text: string; is_included: boolean }[])?.filter((f) => f.is_included).map((f) => f.feature_text) ?? [],
    })),
  };
}

// ─── TOOL: createSupportTicket ───────────────────────────────

export async function createSupportTicket(params: {
  subject: string;
  message: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}) {
  const { data, error } = await supabase
    .from("ai_support_tickets")
    .insert({
      session_id: params.sessionId ?? null,
      user_id: params.userId ?? null,
      user_name: params.userName ?? "Guest",
      user_email: params.userEmail ?? null,
      user_role: params.userRole ?? "guest",
      subject: params.subject,
      message: params.message,
      priority: params.priority ?? "medium",
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Failed to create ticket. Please try again." };

  return {
    success: true,
    ticketId: data.id,
    message: `Your support ticket has been created (ID: **${data.id.slice(0, 8).toUpperCase()}**). Our team will respond within 24 hours.`,
  };
}

// ─── TOOL: getSignupGuide ────────────────────────────────────

export function getSignupGuide(userType: "society" | "landlord" | "tenant") {
  const guides: Record<string, object> = {
    society: {
      steps: ["Go to myrentsaathi.com/signup → select 'Housing Society'", "Enter society name, city, total flats", "Set up admin account", "Add flat details and invite residents", "Configure dues and maintenance fees", "Start collecting payments online!"],
      note: "Free 14-day trial — no credit card required.",
    },
    landlord: {
      steps: ["Go to myrentsaathi.com/signup → select 'Landlord'", "Create account with email & phone", "Add property details and rent amount", "Add tenant details and move-in date", "Generate digital rent agreement", "Enable WhatsApp rent reminders"],
      note: "Plans from ₹499/month. 14-day free trial.",
    },
    tenant: {
      steps: ["Ask your landlord or admin to add you to MyRentSaathi", "You'll receive a WhatsApp/email invitation", "Create your account via the invite link", "View dues, pay online, download receipts", "Raise complaints and access society notices"],
      note: "Tenant accounts are FREE.",
    },
  };
  return guides[userType] ?? guides.society;
}

// ─── TOOL: getFAQAnswer ──────────────────────────────────────

export function getFAQAnswer(topic: string) {
  const faqs: Record<string, string> = {
    trial:     "Yes! 14-day free trial with full features. No credit card required.",
    refund:    "7-day refund policy after first payment. Contact support@myrentsaathi.com.",
    payment:   "We accept UPI, debit/credit cards, net banking, and bank transfers. All payments secured.",
    cancel:    "Cancel anytime from account settings. Data retained 30 days after cancellation.",
    data:      "Data stored securely in India on encrypted servers. Never shared with third parties.",
    whatsapp:  "Yes! Automated rent reminders, payment confirmations, and notices via WhatsApp.",
    app:       "Web app that works on all devices. Native mobile app coming soon.",
    multiple:  "Yes! Manage multiple properties and societies under one account.",
    nri:       "Yes! NRI plan designed for landlords managing properties remotely from abroad.",
    agreement: "Yes! Generate legally valid digital rent agreements directly from the platform.",
  };

  const topicLower = topic.toLowerCase();
  for (const [key, answer] of Object.entries(faqs)) {
    if (topicLower.includes(key)) return { answer };
  }
  return { answer: "I don't have a specific answer for that. Let me create a support ticket so our team can help you." };
}

// ─── TOOL: getSubscriptionInfo ───────────────────────────────
// Returns the user's current subscription / plan details

export async function getSubscriptionInfo(userId: string) {
  if (!userId) return { error: "Not logged in." };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_name, plan_type, status, plan_price, starts_at, expires_at, trial_days, activated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) return { plan: "None", status: "No active subscription found." };

  const now = new Date();
  const expires = sub.expires_at ? new Date(sub.expires_at) : null;
  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86400000)) : null;

  return {
    plan: sub.plan_name,
    plan_type: sub.plan_type,
    status: sub.status,
    price: fmt(sub.plan_price),
    starts_at: fmtDate(sub.starts_at),
    expires_at: fmtDate(sub.expires_at),
    days_remaining: daysLeft !== null ? `${daysLeft} days` : "N/A",
    is_trial: sub.status === "trial",
    trial_days: sub.trial_days ?? null,
    activated_at: fmtDate(sub.activated_at),
  };
}

// ─── OPENAI TOOL DEFINITIONS ─────────────────────────────────

export const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "getUserDashboard",
      description: "Get the logged-in user's complete account summary: flat details, society info, due amounts, property list. ALWAYS call this first when a logged-in user asks about their account, flat, rent, dues, society, or 'my details'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMaintenanceDues",
      description: "Get maintenance/rent payment history and pending dues for the user's flat. Use when they ask about dues, payments, pending amount, or payment history.",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "How many months of history to fetch (default 6)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMyComplaints",
      description: "Get the user's complaint/ticket history. Use when they ask about their complaints, tickets, issues raised, or how to raise a new complaint.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSocietyNotices",
      description: "Get recent society notices for the user. Use when they ask about notices, announcements, or society news.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMyVehicles",
      description: "Get registered vehicles and parking slot assignments for the user. Use when they ask about their car, bike, vehicle registration, or parking.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getVisitorLog",
      description: "Get recent visitor history for the user's flat or society. Use when they ask about visitors, guest entries, or visitor log.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSocietyStaff",
      description: "Get the society staff directory: guards, cleaners, plumbers, etc. with their contact numbers. Use when anyone asks about society staff, guard contact, or who to call for maintenance.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getAdminFinancialSummary",
      description: "Get financial summary for the society admin: this month's income, expenses, pending dues, net balance, and year-to-date figures. Admin only.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSocietyOccupancy",
      description: "Get society occupancy statistics: occupied vs vacant flats, vehicle counts, parking stats. Admin only.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "howToGuide",
      description: "Get step-by-step guide for any platform feature. Use when users ask 'how to pay', 'how to raise complaint', 'how to register vehicle', 'how visitor entry works', 'how to post notice', 'how to vote in poll', etc.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "The feature or task they want to learn about — e.g. 'pay maintenance', 'raise complaint', 'register vehicle', 'visitor entry', 'reset password'" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSubscriptionInfo",
      description: "Get the user's current subscription / plan details: plan name, status (trial/active/expired), expiry date, days remaining, price. Use when user asks about 'mera plan', 'plan kab tak valid hai', 'subscription expiry', 'kitne din baaki hain', 'plan status', 'kab expire hoga'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPricingPlans",
      description: "Fetch all active pricing plans — society and landlord plans with features and prices.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFAQAnswer",
      description: "Answer common questions about trials, refunds, payments, cancellation, WhatsApp, data security, NRI, agreements.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic keyword: trial, refund, payment, cancel, whatsapp, nri, agreement, app, data, multiple" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSignupGuide",
      description: "Get step-by-step signup instructions for a specific user type.",
      parameters: {
        type: "object",
        properties: {
          userType: { type: "string", enum: ["society", "landlord", "tenant"], description: "Type of user signing up" },
        },
        required: ["userType"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createSupportTicket",
      description: "Create a support ticket for human escalation. Use when user has an issue that needs a human, says 'talk to human', or their question can't be resolved by you.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Brief subject of the issue" },
          message: { type: "string", description: "Detailed description of the problem" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Use 'urgent' for payment failures or no access" },
        },
        required: ["subject", "message"],
      },
    },
  },
];
