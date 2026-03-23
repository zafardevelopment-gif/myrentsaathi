import { WEBSITE_TESTIMONIALS } from "@/lib/mockData";

export default function Testimonials() {
  return (
    <section className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            TESTIMONIALS
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-ink leading-tight tracking-tight">
            What Our Users Are Saying
          </h2>
          <p className="text-[17px] text-ink-muted mt-3.5 leading-relaxed max-w-[600px] mx-auto">
            Real feedback from real users
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WEBSITE_TESTIMONIALS.slice(0, 3).map((t, i) => (
            <div
              key={t.name}
              className="hover-lift animate-fade-up bg-white rounded-[18px] p-7 border border-border-default"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-sm text-ink-soft leading-relaxed mb-5 italic">
                &ldquo;{t.text}&rdquo;
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-forest-500 text-white flex items-center justify-center text-base font-extrabold">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Extra testimonials row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 max-w-[760px] mx-auto">
          {WEBSITE_TESTIMONIALS.slice(3, 5).map((t, i) => (
            <div
              key={t.name}
              className="hover-lift animate-fade-up bg-white rounded-[18px] p-7 border border-border-default"
              style={{ animationDelay: `${(i + 3) * 0.1}s` }}
            >
              <div className="text-sm text-ink-soft leading-relaxed mb-5 italic">
                &ldquo;{t.text}&rdquo;
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-forest-500 text-white flex items-center justify-center text-base font-extrabold">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
