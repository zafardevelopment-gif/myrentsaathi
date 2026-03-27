import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getPricingPlans,
  createSupportTicket,
  getSignupGuide,
  getFAQAnswer,
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
  const userBlock = user?.role
    ? `\nLogged-in user — Role: ${user.role}, Name: ${user.name ?? "Unknown"}`
    : "\nGuest user.";

  return `You are Saathi, the friendly AI support assistant for MyRentSaathi — India's rent and society management platform.

Answer questions about pricing, features, signup, billing, and common issues. Be warm and concise.

Pricing:
- Society: Starter ₹2,999/mo (50 flats), Growth ₹5,999/mo (200 flats), Enterprise ₹9,999/mo (unlimited)
- Landlord: Basic ₹499/mo (5 props), Pro ₹999/mo (20 props), NRI ₹1,999/mo (unlimited)
- 14-day free trial, no credit card required. Tenant access is FREE.

Use tools when relevant. For human escalation, call createSupportTicket.
Keep responses concise. Use bullet points for lists.
${userBlock}`;
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  user: ChatUserContext | null,
  sessionId?: string
): Promise<string> {
  try {
    switch (name) {
      case "getPricingPlans":
        return JSON.stringify(await getPricingPlans());
      case "createSupportTicket":
        return JSON.stringify(
          await createSupportTicket({
            subject: String(args.subject ?? "Support Request"),
            message: String(args.message ?? ""),
            priority: (args.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
            userId: user?.userId,
            userName: user?.name,
            userEmail: user?.email,
            userRole: user?.role,
            sessionId,
          })
        );
      case "getSignupGuide":
        return JSON.stringify(
          getSignupGuide((args.userType as "society" | "landlord" | "tenant") ?? "society")
        );
      case "getFAQAnswer":
        return JSON.stringify(getFAQAnswer(String(args.topic ?? "")));
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

    // Agentic loop — max 5 iterations for tool calls
    for (let i = 0; i < 5; i++) {
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

      // Execute tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
          const result = await dispatchTool(tc.function.name, args, user, sessionId);
          return { role: "tool" as const, tool_call_id: tc.id, content: result };
        })
      );
      messages.push(...toolResults);
    }

    // Trim history
    if (messages.length > 42) {
      messageStore.set(threadId, [messages[0], ...messages.slice(-40)]);
    }

    return NextResponse.json({ content: finalContent || "Sorry, I couldn't generate a response." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat/route] ERROR:", msg);
    return NextResponse.json({ content: `Error: ${msg}` });
  }
}
