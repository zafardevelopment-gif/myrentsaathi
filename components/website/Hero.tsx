"use client";

import { WEBSITE_STATS } from "@/lib/mockData";

export default function Hero() {
  return (
    <section className="pt-[120px] pb-20 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,_#f9e4bf_0%,_transparent_70%)] rounded-full opacity-50" />
      <div className="absolute -bottom-[50px] -left-[80px] w-[300px] h-[300px] bg-[radial-gradient(circle,_rgba(27,94,59,0.1)_0%,_transparent_70%)] rounded-full" />

      <div className="max-w-[1140px] mx-auto px-6">
        <div className="max-w-[700px] mx-auto text-center relative">
          <div className="animate-fade-up">
            <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider">
              🇮🇳 INDIA&apos;S FIRST ALL-IN-ONE PLATFORM
            </span>
          </div>

          <h1 className="animate-fade-up delay-100 font-serif text-[44px] md:text-[52px] font-black leading-[1.1] tracking-tight mt-5 text-ink">
            Society + Rent + Tenant
            <br />
            <span className="text-brand-500">All In One Place.</span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg text-ink-muted leading-relaxed mt-5 max-w-[560px] mx-auto">
            WhatsApp rent reminders, online maintenance collection, AI
            agreements, complaint tracking —{" "}
            <b>property management without the hassle.</b>
          </p>

          <div className="animate-fade-up delay-300 flex gap-3.5 justify-center mt-8 flex-wrap">
            <a
              href="#pricing"
              className="hover-lift px-9 py-4 rounded-[14px] bg-gradient-to-br from-brand-500 to-brand-600 text-white text-base font-bold shadow-[0_4px_20px_rgba(194,102,10,0.3)] cursor-pointer"
            >
              Start Free 14-Day Trial →
            </a>
            <a
              href="#how"
              className="hover-lift px-9 py-4 rounded-[14px] border-2 border-brand-500 text-brand-500 text-base font-bold cursor-pointer"
            >
              See How It Works
            </a>
          </div>

          <p className="animate-fade-up delay-400 text-[13px] text-ink-muted mt-3.5">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
        </div>

        {/* Trust Bar */}
        <div className="animate-fade-up delay-500 flex justify-center gap-10 mt-14 flex-wrap">
          {WEBSITE_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[28px] font-black text-brand-500 font-serif">
                {stat.value}
              </div>
              <div className="text-xs text-ink-muted font-semibold mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
