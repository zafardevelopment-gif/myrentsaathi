"use client";

import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", contact: "", user_type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.contact.trim() || !form.message.trim()) {
      setError("Please fill in name, contact, and message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess(true);
      setForm({ name: "", contact: "", user_type: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[700px] mx-auto px-6">
        <h1 className="font-serif text-[38px] font-extrabold text-ink leading-tight mb-4">
          Contact Us
        </h1>
        <p className="text-[17px] text-ink/70 mb-10">
          Have questions? We&apos;re here to help. Reach us via WhatsApp, email, or book a demo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          <a
            href="https://wa.me/919204298771"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-[16px] border border-border-default p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">💬</div>
            <div className="font-bold text-ink mb-1 text-[14px]">WhatsApp Support</div>
            <div className="text-[12px] text-ink-muted mb-1">+91 92042 98771</div>
            <div className="text-[11px] text-ink-muted mb-3">Chat with our team instantly</div>
            <span className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold inline-block">
              Chat Now
            </span>
          </a>

          <a
            href="mailto:support@myrentsaathi.com"
            className="bg-white rounded-[16px] border border-border-default p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">📧</div>
            <div className="font-bold text-ink mb-1 text-[14px]">Email Support</div>
            <div className="text-[12px] text-ink-muted mb-3">support@myrentsaathi.com</div>
            <span className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold inline-block">
              Send Email
            </span>
          </a>

          <div className="bg-white rounded-[16px] border border-border-default p-5 text-center">
            <div className="text-3xl mb-3">📅</div>
            <div className="font-bold text-ink mb-1 text-[14px]">Book a Demo</div>
            <div className="text-[12px] text-ink-muted mb-3">See the platform live in 20 min</div>
            <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold cursor-pointer hover:bg-brand-600">
              Schedule
            </button>
          </div>
        </div>

        <h2 className="font-serif text-[22px] font-bold text-ink mb-4">Send a Message</h2>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-[16px] p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-green-700 text-[16px] mb-1">Message sent!</div>
            <div className="text-[13px] text-green-600">Our team will get back to you shortly.</div>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-6 py-2 rounded-xl bg-brand-500 text-white text-[13px] font-bold cursor-pointer hover:bg-brand-600"
            >
              Send another
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                placeholder="Email or phone"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={form.user_type}
              onChange={(e) => setForm((f) => ({ ...f, user_type: e.target.value }))}
              className="w-full border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">I am a...</option>
              <option value="Landlord">Landlord</option>
              <option value="Society Committee Member">Society Committee Member</option>
              <option value="Tenant">Tenant</option>
              <option value="Other">Other</option>
            </select>
            <textarea
              rows={4}
              placeholder="How can we help?"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            {error && (
              <div className="text-[13px] text-red-600 font-medium">{error}</div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold cursor-pointer hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
