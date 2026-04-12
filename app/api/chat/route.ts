import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getPricingPlans,
  createSupportTicket,
  getSignupGuide,
  getFAQAnswer,
  getUserDashboard,
  getMaintenanceDues,
  getMyComplaints,
  getSocietyNotices,
  getMyVehicles,
  getVisitorLog,
  getSocietyStaff,
  getAdminFinancialSummary,
  getSocietyOccupancy,
  howToGuide,
  CHAT_TOOLS,
  type ChatUserContext,
} from "@/lib/chat-tools";

export const runtime = "nodejs";
export const maxDuration = 30;

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://myrentsaathi.com",
      "X-Title": "MyRentSaathi",
    },
  });
}

const messageStore = new Map<string, OpenAI.Chat.ChatCompletionMessageParam[]>();

function buildSystemPrompt(user: ChatUserContext | null): string {
  const roleLabel: Record<string, string> = {
    admin:    "Society Admin",
    landlord: "Landlord",
    tenant:   "Tenant",
    guard:    "Security Guard",
    board:    "Board Member",
  };

  const userBlock = user?.userId
    ? `\n\n━━ LOGGED-IN USER ━━\nName: ${user.name ?? "Unknown"}\nEmail: ${user.email ?? ""}\nRole: ${roleLabel[user.role ?? ""] ?? user.role ?? "Unknown"}\nUser ID: ${user.userId}\n\nIMPORTANT: This user is logged in. When they ask about "my flat", "my dues", "my vehicles", "my complaints", "my society", or anything about their own account — ALWAYS use the getUserDashboard tool first to get their real data. Never say you can't access their data.`
    : "\n\nGuest user (not logged in). Answer general questions about the platform. For account-specific questions, ask them to log in.";

  const capabilities = user?.role === "admin"
    ? "\nAs an ADMIN, you can: view full society stats, financial summary, occupancy, all notices, staff directory, visitor logs, maintenance analytics."
    : user?.role === "tenant"
    ? "\nAs a TENANT, you can: view your flat/society details, pending dues, payment history, complaints, notices, vehicles, visitor log."
    : user?.role === "landlord"
    ? "\nAs a LANDLORD, you can: view your properties, tenant details, rent/maintenance dues, notices, vehicles, visitor log."
    : "";

  return `You are **Saathi**, the AI-powered customer support agent for MyRentSaathi — India's society and rent management platform. You replace human support and can answer ANY question a user has about their account, society, or the platform.

Your personality: Warm, helpful, concise. Respond in the same language as the user (Hindi, Hinglish, or English). Use bullet points for lists. Bold important info.

━━ WHAT YOU CAN DO ━━
• Show users their real account data (flat, dues, society, vehicles, complaints, notices, visitors, staff)
• Guide users step-by-step on how to use any feature
• Answer financial questions (dues, payments, salary, expenses)
• Provide society occupancy and analytics (admin only)
• Escalate complex issues by creating support tickets
• Answer FAQs about pricing, plans, features, refunds, WhatsApp, NRI, agreements

━━ TOOL USAGE RULES ━━
• When a logged-in user asks about THEIR data → call getUserDashboard first
• For dues / payment history → call getMaintenanceDues
• For complaints → call getMyComplaints
• For notices → call getSocietyNotices
• For vehicles / parking → call getMyVehicles
• For visitors → call getVisitorLog
• For staff contacts → call getSocietyStaff
• Admin asks for finances → call getAdminFinancialSummary
• Admin asks for occupancy → call getSocietyOccupancy
• "How to..." questions → call howToGuide
• Pricing questions → call getPricingPlans
• General FAQs → call getFAQAnswer
• Can't resolve → call createSupportTicket

━━ PRICING (quick reference) ━━
Society: Starter ₹2,999/mo (50 flats) · Growth ₹5,999/mo (200 flats) · Enterprise ₹9,999/mo (unlimited)
Landlord: Basic ₹499/mo · Pro ₹999/mo · NRI ₹1,999/mo
Tenant: FREE · 14-day free trial for all plans
${userBlock}${capabilities}`;
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  user: ChatUserContext | null,
  sessionId?: string
): Promise<string> {
  const uid = user?.userId ?? "";
  const role = user?.role ?? "";

  try {
    switch (name) {
      // ── Account & Data tools ──
      case "getUserDashboard":
        return JSON.stringify(await getUserDashboard(uid, role));
      case "getMaintenanceDues":
        return JSON.stringify(await getMaintenanceDues(uid, role, Number(args.months ?? 6)));
      case "getMyComplaints":
        return JSON.stringify(await getMyComplaints(uid));
      case "getSocietyNotices":
        return JSON.stringify(await getSocietyNotices(uid, role));
      case "getMyVehicles":
        return JSON.stringify(await getMyVehicles(uid));
      case "getVisitorLog":
        return JSON.stringify(await getVisitorLog(uid, role));
      case "getSocietyStaff":
        return JSON.stringify(await getSocietyStaff(uid, role));
      case "getAdminFinancialSummary":
        return JSON.stringify(await getAdminFinancialSummary(uid));
      case "getSocietyOccupancy":
        return JSON.stringify(await getSocietyOccupancy(uid));

      // ── How-to guide ──
      case "howToGuide":
        return JSON.stringify(howToGuide(String(args.topic ?? "")));

      // ── Generic/marketing tools ──
      case "getPricingPlans":
        return JSON.stringify(await getPricingPlans());
      case "getSignupGuide":
        return JSON.stringify(getSignupGuide((args.userType as "society" | "landlord" | "tenant") ?? "society"));
      case "getFAQAnswer":
        return JSON.stringify(getFAQAnswer(String(args.topic ?? "")));
      case "createSupportTicket":
        return JSON.stringify(
          await createSupportTicket({
            subject: String(args.subject ?? "Support Request"),
            message: String(args.message ?? ""),
            priority: (args.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
            userId: uid || undefined,
            userName: user?.name,
            userEmail: user?.email,
            userRole: role,
            sessionId,
          })
        );

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      prompt: string;
      threadId: string;
      user?: ChatUserContext;
      sessionId?: string;
    };

    const { prompt, threadId, user = null, sessionId } = body;

    if (!prompt || !threadId) {
      return NextResponse.json({ content: "Missing prompt or threadId." }, { status: 400 });
    }

    if (!messageStore.has(threadId)) {
      messageStore.set(threadId, [
        { role: "system", content: buildSystemPrompt(user) },
      ]);
    }

    const messages = messageStore.get(threadId)!;
    messages.push({ role: "user", content: prompt });

    const client = getClient();
    let finalContent = "";

    // Agentic loop — max 6 iterations for tool chains
    for (let i = 0; i < 6; i++) {
      const response = await client.chat.completions.create({
        model: "google/gemini-2.0-flash-001",
        messages,
        tools: CHAT_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      if (!choice) break;

      const assistantMsg = choice.message;
      messages.push(assistantMsg);

      const toolCalls = assistantMsg.tool_calls ?? [];

      if (toolCalls.length === 0) {
        finalContent = assistantMsg.content ?? "";
        break;
      }

      // Execute tool calls in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const fn = tc as unknown as { id: string; function: { name: string; arguments: string } };
          const args = JSON.parse(fn.function.arguments || "{}") as Record<string, unknown>;
          const result = await dispatchTool(fn.function.name, args, user, sessionId);
          return { role: "tool" as const, tool_call_id: fn.id, content: result };
        })
      );
      messages.push(...toolResults);
    }

    // Trim history — keep system + last 40 messages
    if (messages.length > 42) {
      messageStore.set(threadId, [messages[0], ...messages.slice(-40)]);
    }

    return NextResponse.json({ content: finalContent || "Sorry, I couldn't generate a response. Please try again." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat/route] ERROR:", msg);
    return NextResponse.json({ content: `Something went wrong. Please try again.` });
  }
}
