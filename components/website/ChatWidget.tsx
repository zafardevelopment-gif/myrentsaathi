"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const QUICK_REPLIES = [
  "Show me pricing plans",
  "How do I sign up?",
  "Is there a free trial?",
  "Talk to a human",
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Simple markdown-like renderer ───────────────────────────

function AssistantText({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const text = content;

  if (!text && isStreaming) return <TypingDots />;
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-1 leading-relaxed text-sm">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (/^[-•]\s/.test(line.trim())) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-brand-400 flex-shrink-0">•</span>
              <span>{renderInline(line.replace(/^[\s\-•]+/, ""))}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line.trim())) {
          const match = line.trim().match(/^(\d+)\.\s+(.*)$/);
          if (match) return (
            <div key={i} className="flex gap-1.5">
              <span className="text-brand-500 font-bold flex-shrink-0 text-xs mt-0.5">{match[1]}.</span>
              <span>{renderInline(match[2])}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
      {isStreaming && <span className="inline-block w-1 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle" />}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}

// ─── MAIN WIDGET ─────────────────────────────────────────────

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId] = useState(() => `thread_${genId()}_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: genId(),
        role: "assistant",
        content: user
          ? `Hi ${user.name?.split(" ")[0] || "there"}! 👋 I'm Saathi. How can I help you today?`
          : "Hi! 👋 I'm **Saathi**, your MyRentSaathi assistant.\n\nAsk me about pricing, features, or getting started!",
      }]);
    }
  }, [open, messages.length, user]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsgId = genId();
    const assistantMsgId = genId();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmed },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          threadId,
          user: user ? { role: user.role, name: user.name, email: user.email } : null,
        }),
      });

      const data = await res.json() as { content?: string };
      const content = data.content ?? "Sorry, something went wrong.";

      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content, isStreaming: false } : m
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: `Error: ${msg}`, isStreaming: false } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [loading, threadId, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!open && (
          <div className="bg-white text-ink text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-border-default whitespace-nowrap">
            💬 Chat with Saathi
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close chat" : "Open chat"}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-border-default flex flex-col overflow-hidden" style={{ height: "520px" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg flex-shrink-0">🏠</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Saathi — AI Support</div>
              <div className="text-white/70 text-[11px] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300" />
                Online • MyRentSaathi
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-warm-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">🏠</div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white rounded-tr-sm text-sm"
                    : "bg-white border border-border-default text-ink shadow-sm rounded-tl-sm"
                }`}>
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <AssistantText content={msg.content} isStreaming={msg.isStreaming} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-warm-50 flex-shrink-0">
              {QUICK_REPLIES.map((qr) => (
                <button key={qr} onClick={() => sendMessage(qr)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-brand-300 text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer whitespace-nowrap">
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-light px-3 py-2.5 bg-white flex items-end gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Saathi anything..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none text-sm text-ink bg-warm-50 border border-border-default rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 disabled:opacity-50 max-h-24 overflow-y-auto"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="w-9 h-9 flex-shrink-0 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-ink-muted py-1.5 border-t border-border-light bg-white flex-shrink-0">
            Powered by <span className="font-semibold text-brand-500">MyRentSaathi AI</span>
            {" · "}
            <span className="cursor-pointer hover:text-ink" onClick={() => sendMessage("Talk to a human")}>Talk to human</span>
          </div>
        </div>
      )}
    </>
  );
}
