export default function ProblemSolution() {
  const problems = [
    "Important notices get lost in WhatsApp groups",
    "Maintenance collection takes 15+ days",
    "Tracking rent in Excel is a headache",
    "Complaints are raised and then forgotten",
    "3 trips to the lawyer for one agreement",
  ];

  const solutions = [
    "Official notices + automatic WhatsApp reminders",
    "90% maintenance collected in 3 days",
    "One dashboard for everything — real-time data",
    "Ticket system — numbers, tracking, escalation",
    "AI draft free, lawyer ₹499, registration ₹999",
  ];

  return (
    <section className="bg-brand-900 py-12">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-10 text-white">
          {/* Problems */}
          <div>
            <div className="text-[13px] text-brand-300 font-bold tracking-[2px] uppercase mb-3">
              😤 WITHOUT RENTSAATHI
            </div>
            {problems.map((p) => (
              <div
                key={p}
                className="text-sm text-white/70 py-1.5 flex gap-2 items-center"
              >
                <span className="text-red-500 flex-shrink-0">✗</span> {p}
              </div>
            ))}
          </div>

          {/* Divider with arrow */}
          <div className="hidden md:block w-0.5 h-[200px] bg-white/10 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-[22px]">
              →
            </div>
          </div>

          {/* Mobile divider */}
          <div className="md:hidden flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-[22px]">
              ↓
            </div>
          </div>

          {/* Solutions */}
          <div>
            <div className="text-[13px] text-green-400 font-bold tracking-[2px] uppercase mb-3">
              😎 WITH RENTSAATHI
            </div>
            {solutions.map((s) => (
              <div
                key={s}
                className="text-sm text-white/90 py-1.5 flex gap-2 items-center"
              >
                <span className="text-green-500 flex-shrink-0">✓</span> {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
