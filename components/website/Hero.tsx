// Benefit-focused trust stats
const HERO_STATS = [
  { value: "90%", label: "Rent Collected in 3 Days" },
  { value: "0%", label: "Commission on UPI" },
  { value: "5 min", label: "Setup Time" },
  { value: "24×7", label: "WhatsApp Updates" },
];

export default function Hero() {
  return (
    <section className="pt-[110px] pb-16 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,_#f9e4bf_0%,_transparent_70%)] rounded-full opacity-50" />
      <div className="absolute -bottom-[50px] -left-[80px] w-[300px] h-[300px] bg-[radial-gradient(circle,_rgba(27,94,59,0.1)_0%,_transparent_70%)] rounded-full" />

      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* ── Left: copy ── */}
          <div className="text-center lg:text-left relative">
            <div className="animate-fade-up">
              <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider">
                🇮🇳 INDIA&apos;S ALL-IN-ONE PLATFORM
              </span>
            </div>

            <h1 className="animate-fade-up delay-100 font-serif text-[40px] md:text-[50px] font-black leading-[1.08] tracking-tight mt-5 text-ink">
              Rent, Society &amp; Tenant Management —{" "}
              <span className="text-brand-500">All In One Place.</span>
            </h1>

            <p className="animate-fade-up delay-200 text-lg text-ink-muted leading-relaxed mt-5 max-w-[560px] mx-auto lg:mx-0">
              WhatsApp rent reminders, online maintenance collection, AI rental
              agreements, complaint tracking —{" "}
              <b>property management without the hassle.</b>
            </p>

            <div className="animate-fade-up delay-300 flex gap-3.5 justify-center lg:justify-start mt-8 flex-wrap">
              <a
                href="/signup"
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

          {/* ── Right: product visual (pure CSS, no image needed) ── */}
          <div className="animate-fade-up delay-300 relative hidden sm:block" aria-hidden="true">
            {/* Dashboard card */}
            <div className="bg-white rounded-2xl border border-border-default shadow-[0_20px_60px_rgba(28,25,23,0.12)] p-5 max-w-[440px] mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] text-ink-muted font-semibold uppercase tracking-wider">
                    June Collection
                  </div>
                  <div className="text-[26px] font-black text-ink font-serif">
                    ₹4,82,500
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-forest-50 text-forest-600 text-xs font-bold">
                  ↑ 92% collected
                </span>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-2 h-[90px] mb-4">
                {[40, 55, 45, 70, 60, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-md ${
                      i === 6 ? "bg-brand-500" : "bg-brand-200"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-2.5">
                {[
                  { flat: "A-204 · Rahul S.", status: "Paid", ok: true },
                  { flat: "B-101 · Priya M.", status: "Paid", ok: true },
                  { flat: "C-302 · Amit K.", status: "Reminder sent", ok: false },
                ].map((r) => (
                  <div
                    key={r.flat}
                    className="flex items-center justify-between bg-warm-50 rounded-xl px-3.5 py-2.5"
                  >
                    <span className="text-[13px] font-semibold text-ink">
                      {r.flat}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        r.ok
                          ? "bg-forest-50 text-forest-600"
                          : "bg-brand-100 text-brand-600"
                      }`}
                    >
                      {r.ok ? "✓ " : "🔔 "}
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating WhatsApp reminder card */}
            <div className="absolute -bottom-6 -left-2 lg:-left-8 bg-white rounded-2xl border border-border-default shadow-[0_12px_40px_rgba(28,25,23,0.15)] px-4 py-3 flex items-center gap-3 animate-fade-up delay-500">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center text-xl">
                💬
              </div>
              <div>
                <div className="text-[12px] font-bold text-ink">
                  WhatsApp Reminder Sent
                </div>
                <div className="text-[11px] text-ink-muted">
                  Rent due · UPI link attached
                </div>
              </div>
            </div>

            {/* Floating payment card */}
            <div className="absolute -top-5 -right-2 lg:-right-6 bg-white rounded-2xl border border-border-default shadow-[0_12px_40px_rgba(28,25,23,0.15)] px-4 py-3 flex items-center gap-3 animate-fade-up delay-400">
              <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center text-xl">
                ✓
              </div>
              <div>
                <div className="text-[12px] font-bold text-ink">
                  ₹18,000 Received
                </div>
                <div className="text-[11px] text-ink-muted">
                  Receipt auto-sent
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Bar — benefit stats */}
        <div className="animate-fade-up delay-500 flex justify-center gap-10 mt-16 flex-wrap">
          {HERO_STATS.map((stat) => (
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
