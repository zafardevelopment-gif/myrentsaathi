import { WEBSITE_HOW_IT_WORKS } from "@/lib/mockData";

export default function HowItWorks() {
  return (
    <section id="how" className="py-20 bg-warm-50">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            HOW IT WORKS
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-ink leading-tight tracking-tight">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-[17px] text-ink-muted mt-3.5 leading-relaxed max-w-[600px] mx-auto">
            Setup takes just 5 minutes. Everything runs automatically from
            tomorrow.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WEBSITE_HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.step}
              className="animate-fade-up text-center relative"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Step Number */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-[28px] font-black font-serif mx-auto mb-4 shadow-[0_8px_24px_rgba(194,102,10,0.25)]">
                {step.step}
              </div>

              {/* Connector line (desktop only) */}
              {i < 3 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-brand-200 z-0" />
              )}

              <div className="text-lg font-bold text-ink mb-1.5">
                {step.title}
              </div>
              <div className="text-[13px] text-ink-muted leading-relaxed">
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
