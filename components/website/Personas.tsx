import Link from "next/link";

const PERSONAS = [
  {
    icon: "👨‍💼",
    title: "For Landlords",
    desc: "Automate rent collection with WhatsApp + UPI, manage tenants across properties, generate AI rental agreements, and get tax-ready reports.",
    points: ["WhatsApp rent reminders", "0% UPI commission", "AI rent agreements"],
    href: "/for-landlords",
    cta: "Explore Landlord Features",
  },
  {
    icon: "🏢",
    title: "For Societies & RWAs",
    desc: "Collect maintenance online, publish official notices, run polls & voting, track complaints with a ticket system — full transparency for residents.",
    points: ["90% collection in 3 days", "Notices & polls", "Complaint tracking"],
    href: "/for-societies",
    cta: "Explore Society Features",
  },
  {
    icon: "🧑‍🤝‍🧑",
    title: "For Tenants",
    desc: "No app download needed. Pay rent via UPI link on WhatsApp, get instant receipts, raise complaints, and access your agreement anytime.",
    points: ["Pay via WhatsApp", "Instant receipts", "No app required"],
    href: "/for-tenants",
    cta: "Explore Tenant Features",
  },
];

export default function Personas() {
  return (
    <section id="personas" className="py-20 bg-warm-50">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            BUILT FOR EVERYONE
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-ink leading-tight tracking-tight">
            One Platform. Three Happy Users.
          </h2>
          <p className="text-[17px] text-ink-muted mt-3.5 leading-relaxed max-w-[600px] mx-auto">
            Whether you&apos;re a landlord, a society committee member, or a
            tenant — MyRentSaathi makes your life easier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((p, i) => (
            <div
              key={p.title}
              className="hover-lift animate-fade-up bg-white rounded-[18px] p-8 border border-border-default flex flex-col"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-3xl mb-5">
                {p.icon}
              </div>
              <h3 className="text-xl font-extrabold text-ink mb-2.5">
                {p.title}
              </h3>
              <p className="text-[14px] text-ink-muted leading-relaxed mb-5">
                {p.desc}
              </p>
              <ul className="space-y-2 mb-6">
                {p.points.map((pt) => (
                  <li
                    key={pt}
                    className="text-[13px] text-ink-soft font-semibold flex items-center gap-2"
                  >
                    <span className="text-forest-500">✓</span> {pt}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className="mt-auto inline-block text-center px-5 py-3 rounded-xl border-2 border-brand-500 text-brand-500 text-sm font-bold hover:bg-brand-500 hover:text-white transition-colors"
              >
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
