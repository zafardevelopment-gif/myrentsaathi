"use client";

import { useState } from "react";

export default function HeroLeadForm() {
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;

    setLoading(true);

    // Open WhatsApp with pre-filled message
    const msg = encodeURIComponent(
      `Namaste! Mujhe MyRentSaathi ka free demo chahiye. Mera number: ${digits}`
    );
    window.open(`https://wa.me/919204298771?text=${msg}`, "_blank");

    // Also log to your analytics / backend (optional - just fires and forgets)
    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, source: "hero_form" }),
    }).catch(() => {});

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-[14px] px-5 py-3.5 mt-6 max-w-[420px]">
        <span className="text-2xl">✅</span>
        <div>
          <div className="text-sm font-bold text-ink">WhatsApp par message bheja!</div>
          <div className="text-xs text-ink-muted mt-0.5">
            Hum 5 minute mein demo schedule karenge.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-2.5 mt-6 max-w-[420px] mx-auto lg:mx-0"
    >
      <div className="relative flex-1">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-semibold">
          +91
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number"
          maxLength={10}
          required
          className="w-full pl-12 pr-4 py-3.5 rounded-[12px] border-2 border-border-default bg-white text-ink text-sm font-semibold placeholder:text-ink-muted/60 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading || phone.replace(/\D/g, "").length < 10}
        className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] bg-[#25D366] hover:bg-[#20b958] text-white text-sm font-bold shadow-[0_4px_16px_rgba(37,211,102,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <span className="text-base">💬</span>
        Free Demo Lein
      </button>
    </form>
  );
}
