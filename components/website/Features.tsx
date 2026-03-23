"use client";

import { useState } from "react";
import { WEBSITE_FEATURES } from "@/lib/mockData";

const FILTERS = [
  { id: "all", label: "All Features" },
  { id: "society", label: "🏢 Society" },
  { id: "landlord", label: "👨‍💼 Landlord" },
];

const COLOR_MAP: Record<string, string> = {
  forest: "bg-forest-50 text-forest-500",
  brand: "bg-brand-100 text-brand-500",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  blue: "bg-blue-100 text-blue-600",
};

export default function Features() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = WEBSITE_FEATURES.filter(
    (f) =>
      activeFilter === "all" ||
      f.category === activeFilter ||
      f.category === "all"
  );

  return (
    <section id="features" className="py-20">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            FEATURES
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-ink leading-tight tracking-tight">
            Every Feature You Need
          </h2>
          <p className="text-[17px] text-ink-muted mt-3.5 leading-relaxed max-w-[600px] mx-auto">
            From society management to rent collection, complaints, parking,
            voting, agreements — everything on one platform.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-[18px] py-2 rounded-3xl text-[13px] font-bold cursor-pointer transition-all ${
                activeFilter === f.id
                  ? "border-2 border-brand-500 bg-brand-100 text-brand-500"
                  : "border border-border-default bg-transparent text-ink-muted hover:border-brand-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((feature, i) => (
            <div
              key={feature.title}
              className="hover-lift animate-fade-up bg-white rounded-[18px] p-7 border border-border-default"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl mb-4 ${
                  COLOR_MAP[feature.color] || "bg-gray-100"
                }`}
              >
                {feature.icon}
              </div>
              <div className="text-base font-bold text-ink mb-2">
                {feature.title}
              </div>
              <div className="text-[13.5px] text-ink-muted leading-relaxed">
                {feature.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
