"use client";

import { useState } from "react";
import { WEBSITE_FAQS } from "@/lib/mockData";

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20">
      <div className="max-w-[700px] mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            FAQ
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-ink leading-tight tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        {/* FAQ Items */}
        {WEBSITE_FAQS.map((faq, i) => (
          <div
            key={i}
            onClick={() => setActiveIndex(activeIndex === i ? null : i)}
            className={`bg-white rounded-[14px] px-[22px] py-[18px] border cursor-pointer transition-all mb-2.5 ${
              activeIndex === i
                ? "border-brand-500"
                : "border-border-default hover:border-brand-300"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-bold text-ink pr-4">
                {faq.q}
              </span>
              <span
                className={`text-xl text-brand-500 transition-transform flex-shrink-0 ${
                  activeIndex === i ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </div>
            {activeIndex === i && (
              <div className="text-sm text-ink-muted leading-relaxed mt-3 pt-3 border-t border-border-light animate-fade-in">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
