"use client";

import { useEffect, useState } from "react";

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // Don't show if already seen this session
    if (sessionStorage.getItem("exit_intent_seen")) return;

    // Desktop: mouse leaves top of viewport
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !triggered) {
        setTriggered(true);
        setShow(true);
        sessionStorage.setItem("exit_intent_seen", "1");
      }
    };

    // Mobile: show after 45 seconds of inactivity
    const mobileTimer = setTimeout(() => {
      if (!triggered && window.innerWidth < 768) {
        setTriggered(true);
        setShow(true);
        sessionStorage.setItem("exit_intent_seen", "1");
      }
    }, 45_000);

    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      clearTimeout(mobileTimer);
    };
  }, [triggered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;

    const msg = encodeURIComponent(
      `Hi! I'd like a free demo of MyRentSaathi. My number: ${digits}`
    );
    window.open(`https://wa.me/919204298771?text=${msg}`, "_blank");

    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, source: "exit_intent" }),
    }).catch(() => {});

    setSubmitted(true);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShow(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-[400px] w-full animate-fade-up">
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="font-serif text-2xl font-black text-ink">
              Thank You!
            </h3>
            <p className="text-ink-muted mt-2 text-sm">
              We'll reach out on WhatsApp within 5 minutes to schedule your free
              demo.
            </p>
            <button
              onClick={() => setShow(false)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-sm"
            >
              Got it, thanks!
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="font-serif text-[22px] font-black text-ink leading-tight">
                Wait! Get a free demo before you leave
              </h3>
              <p className="text-ink-muted text-sm mt-2">
                See how <b>90% maintenance is collected in 3 days</b> — in a
                quick 5-minute demo on WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your WhatsApp number"
                  maxLength={10}
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-[12px] border-2 border-border-default text-ink text-sm font-semibold placeholder:text-ink-muted/60 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={phone.replace(/\D/g, "").length < 10}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[12px] bg-[#25D366] hover:bg-[#20b958] text-white font-bold shadow-[0_4px_16px_rgba(37,211,102,0.3)] transition-all disabled:opacity-50"
              >
                <span>💬</span> Get Free Demo on WhatsApp
              </button>
            </form>

            <p className="text-center text-[11px] text-ink-muted mt-3">
              No spam · We only contact you about your demo
            </p>

            <button
              onClick={() => setShow(false)}
              className="w-full text-center text-xs text-ink-muted hover:text-ink mt-2 py-1"
            >
              No thanks, I'll pass
            </button>
          </>
        )}
      </div>
    </div>
  );
}
