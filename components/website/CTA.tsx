export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-brand-500 to-brand-600">
      <div className="max-w-[1140px] mx-auto px-6 text-center">
        <h2 className="font-serif text-[38px] font-black text-white leading-tight">
          Ready to Transform Your
          <br />
          Property Management?
        </h2>
        <p className="text-[17px] text-white/80 mt-4">
          14-day free trial. No credit card. 5 minute setup.
        </p>
        <div className="flex gap-3.5 justify-center mt-7 flex-wrap">
          <button className="hover-lift px-9 py-4 rounded-[14px] bg-white text-brand-600 text-base font-extrabold cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            Start Free Trial →
          </button>
          <button className="hover-lift px-9 py-4 rounded-[14px] border-2 border-white bg-transparent text-white text-base font-bold cursor-pointer">
            Schedule Demo
          </button>
        </div>
      </div>
    </section>
  );
}
