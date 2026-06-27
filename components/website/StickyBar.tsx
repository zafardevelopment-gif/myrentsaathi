"use client";

import { useEffect, useState } from "react";

export default function StickyBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-brand-600 text-white shadow-[0_2px_20px_rgba(0,0,0,0.25)] animate-fade-down">
      <div className="max-w-[1140px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg hidden sm:block">🎁</span>
          <p className="text-sm font-semibold truncate">
            <span className="font-black">30-day free trial</span> — start now, no credit card required
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://wa.me/919204298771?text=Hi%21%20I%27d%20like%20a%20free%20demo%20of%20MyRentSaathi."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b958] text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors"
          >
            <span>💬</span> WhatsApp Demo
          </a>
          <a
            href="/signup"
            className="hidden sm:flex items-center gap-1.5 bg-white text-brand-600 text-xs font-bold px-3.5 py-1.5 rounded-full hover:bg-brand-50 transition-colors"
          >
            Start Free Trial →
          </a>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Close"
            className="text-white/70 hover:text-white text-lg leading-none ml-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
