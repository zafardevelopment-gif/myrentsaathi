export default function Footer() {
  return (
    <footer className="bg-brand-900 pt-14 pb-8 text-white/60">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[22px]">🏠</span>
              <span className="font-serif text-xl font-extrabold text-white">
                MyRent<span className="text-brand-500">Saathi</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-[280px]">
              India&apos;s smartest society & rent management platform. Property
              management without the hassle.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Product
            </div>
            {[
              "Society Management",
              "Rent Collection",
              "Agreement Generator",
              "Complaint System",
              "Parking Management",
            ].map((l) => (
              <div
                key={l}
                className="text-[13px] mb-2 cursor-pointer hover:text-white transition-colors"
              >
                {l}
              </div>
            ))}
          </div>

          {/* Company */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Company
            </div>
            {["About Us", "Pricing", "Contact", "Blog", "Careers"].map((l) => (
              <div
                key={l}
                className="text-[13px] mb-2 cursor-pointer hover:text-white transition-colors"
              >
                {l}
              </div>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Legal
            </div>
            {[
              "Privacy Policy",
              "Terms of Service",
              "Refund Policy",
              "Data Security",
            ].map((l) => (
              <div
                key={l}
                className="text-[13px] mb-2 cursor-pointer hover:text-white transition-colors"
              >
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.08] pt-5 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="text-xs">
            © 2026 MyRentSaathi.com — All Rights Reserved
          </div>
          <div className="text-xs">Made with ❤️ in India</div>
        </div>
      </div>
    </footer>
  );
}
