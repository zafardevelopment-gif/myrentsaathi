/**
 * Chat Agent Tool Functions
 * Exposed to the Thesys C1 AI agent via OpenAI tool-calling format.
 * All functions are safe: no sensitive data leaked, role-gated where needed.
 */

import { supabase } from "./supabase";

// ─── TYPES ──────────────────────────────────────────────────

export interface ChatUserContext {
  userId?: string;
  role?: string;
  name?: string;
  email?: string;
}

// ─── TOOL: getPricingPlans ───────────────────────────────────

export async function getPricingPlans() {
  const { data, error } = await supabase
    .from("pricing_plans")
    .select(`
      id, name, category, price_monthly, price_yearly,
      description, is_popular, is_active,
      pricing_features(feature_text, is_included)
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    // Static fallback if DB not available
    return {
      plans: [
        {
          name: "Starter",
          category: "society",
          price_monthly: 2999,
          description: "For small housing societies up to 50 units",
          features: ["Up to 50 flats", "Rent collection", "Maintenance tracking", "WhatsApp alerts"],
        },
        {
          name: "Growth",
          category: "society",
          price_monthly: 5999,
          description: "For mid-size societies up to 200 units",
          features: ["Up to 200 flats", "Everything in Starter", "Document management", "Polls & voting", "Priority support"],
        },
        {
          name: "Enterprise",
          category: "society",
          price_monthly: 9999,
          description: "For large gated communities",
          features: ["Unlimited flats", "Everything in Growth", "Custom branding", "Dedicated account manager"],
        },
        {
          name: "Basic",
          category: "landlord",
          price_monthly: 499,
          description: "For individual landlords with up to 5 properties",
          features: ["Up to 5 properties", "Rent tracking", "Tenant management", "Basic reports"],
        },
        {
          name: "Pro",
          category: "landlord",
          price_monthly: 999,
          description: "For landlords with up to 20 properties",
          features: ["Up to 20 properties", "Everything in Basic", "Agreement generation", "NOC management", "WhatsApp automation"],
        },
        {
          name: "NRI",
          category: "landlord",
          price_monthly: 1999,
          description: "For NRI landlords managing properties remotely",
          features: ["Unlimited properties", "Everything in Pro", "Remote management", "Tax reports", "Dedicated NRI support"],
        },
      ],
    };
  }

  return {
    plans: data.map((p) => ({
      name: p.name,
      category: p.category,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      description: p.description,
      is_popular: p.is_popular,
      features: (p.pricing_features as { feature_text: string; is_included: boolean }[])
        ?.filter((f) => f.is_included)
        .map((f) => f.feature_text) ?? [],
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

  if (error || !data) {
    return { success: false, error: "Failed to create ticket. Please try again." };
  }

  return {
    success: true,
    ticketId: data.id,
    message: `Your support ticket has been created (ID: ${data.id.slice(0, 8).toUpperCase()}). Our team will respond within 24 hours.`,
  };
}

// ─── TOOL: getTenantDetails ──────────────────────────────────

export async function getTenantDetails(userId: string) {
  if (!userId) return { error: "User ID required" };

  const { data, error } = await supabase
    .from("users")
    .select(`
      id, full_name, email, phone,
      flat_tenants(
        flat_id,
        flats(flat_number, floor, type,
          societies(name, city)
        )
      )
    `)
    .eq("id", userId)
    .eq("role", "tenant")
    .single();

  if (error || !data) return { error: "Tenant details not found" };

  return {
    name: data.full_name,
    email: data.email,
    phone: data.phone,
    flats: (data.flat_tenants as unknown as {
      flat_id: string;
      flats: { flat_number: string; floor: number; type: string; societies: { name: string; city: string } };
    }[])?.map((ft) => ({
      flatNumber: ft.flats?.flat_number,
      floor: ft.flats?.floor,
      type: ft.flats?.type,
      society: ft.flats?.societies?.name,
      city: ft.flats?.societies?.city,
    })) ?? [],
  };
}

// ─── TOOL: getSocietyDetails ─────────────────────────────────

export async function getSocietyDetails(userId: string) {
  if (!userId) return { error: "User ID required" };

  const { data, error } = await supabase
    .from("users")
    .select(`
      id, full_name, email, role,
      societies!societies_admin_id_fkey(
        id, name, city, total_flats, subscription_status, plan_name
      )
    `)
    .eq("id", userId)
    .single();

  if (error || !data) return { error: "Society details not found" };

  return {
    adminName: data.full_name,
    email: data.email,
    role: data.role,
    society: (data as unknown as { societies: { id: string; name: string; city: string; total_flats: number; subscription_status: string; plan_name: string } }).societies ?? null,
  };
}

// ─── TOOL: getSignupGuide ────────────────────────────────────

export function getSignupGuide(userType: "society" | "landlord" | "tenant") {
  const guides: Record<string, object> = {
    society: {
      steps: [
        "Go to myrentsaathi.com/signup and select 'Housing Society'",
        "Enter your society name, city, and total number of flats",
        "Set up your admin account with email and password",
        "Add your flat details (flat numbers, floors, types)",
        "Invite your residents and board members via WhatsApp or email",
        "Configure dues and maintenance fee structure",
        "Start collecting rent and maintenance payments online!",
      ],
      note: "Free 14-day trial — no credit card required.",
    },
    landlord: {
      steps: [
        "Go to myrentsaathi.com/signup and select 'Landlord'",
        "Create your account with email and phone number",
        "Add your property details (address, flat type, rent amount)",
        "Add your tenant's details and move-in date",
        "Generate the rent agreement digitally",
        "Enable automated WhatsApp rent reminders",
        "Start tracking rent payments and generating receipts!",
      ],
      note: "Plans start at ₹499/month. Free 14-day trial available.",
    },
    tenant: {
      steps: [
        "Ask your landlord or society admin to add you to MyRentSaathi",
        "You will receive a WhatsApp/email invitation",
        "Create your tenant account using the invitation link",
        "View your rent dues, pay online, and download receipts",
        "Raise maintenance complaints directly from the app",
        "Access society notices, polls, and documents",
      ],
      note: "Tenant accounts are FREE — no cost to you.",
    },
  };

  return guides[userType] ?? guides.society;
}

// ─── TOOL: getFAQAnswer ──────────────────────────────────────

export function getFAQAnswer(topic: string) {
  const faqs: Record<string, string> = {
    trial: "Yes! We offer a 14-day free trial with full features. No credit card required to start.",
    refund: "We offer a 7-day refund policy after your first payment. Contact support@myrentsaathi.com.",
    payment: "We accept UPI, debit/credit cards, net banking, and bank transfers. All payments are processed securely.",
    cancel: "You can cancel anytime from your account settings. Your data is retained for 30 days after cancellation.",
    data: "Your data is stored securely in India on encrypted servers. We never share your data with third parties.",
    whatsapp: "Yes! MyRentSaathi sends automated rent reminders, payment confirmations, and notices via WhatsApp.",
    app: "MyRentSaathi is a web app that works on all devices. A native mobile app is coming soon.",
    multiple: "Yes! Landlords can manage multiple properties and societies under one account.",
    nri: "Yes! Our NRI plan is designed for landlords managing properties remotely from abroad.",
    agreement: "Yes! You can generate legally valid digital rent agreements directly from the platform.",
  };

  const topicLower = topic.toLowerCase();
  for (const [key, answer] of Object.entries(faqs)) {
    if (topicLower.includes(key)) return { answer };
  }

  return {
    answer: "I don't have a specific answer for that. Let me create a support ticket so our team can help you.",
  };
}

// ─── OPENAI TOOL DEFINITIONS ─────────────────────────────────

export const CHAT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "getPricingPlans",
      description: "Fetch all active pricing plans for MyRentSaathi — both society and landlord plans with features and prices. Use this when users ask about pricing, plans, or costs.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createSupportTicket",
      description: "Create a support ticket when the user has an issue that needs human help, wants to escalate, or says 'talk to human'. Always confirm with the user before creating.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Brief subject line of the issue" },
          message: { type: "string", description: "Detailed description of the user's problem" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Priority based on urgency — use 'urgent' for payment failures or access issues",
          },
        },
        required: ["subject", "message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSignupGuide",
      description: "Get step-by-step signup instructions for a specific user type. Use when users ask how to get started or sign up.",
      parameters: {
        type: "object",
        properties: {
          userType: {
            type: "string",
            enum: ["society", "landlord", "tenant"],
            description: "The type of user who wants to sign up",
          },
        },
        required: ["userType"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFAQAnswer",
      description: "Get answers to common questions about trials, refunds, payments, cancellation, WhatsApp, data security, NRI features, agreements, etc.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The topic or keyword — e.g. 'trial', 'refund', 'whatsapp', 'nri', 'agreement', 'cancel'",
          },
        },
        required: ["topic"],
      },
    },
  },
];
