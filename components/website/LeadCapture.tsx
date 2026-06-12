"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "919204298771"; // same business number as Footer

/**
 * Lead capture widget — "Get a Callback" / "Demo on WhatsApp".
 * Saves every lead into contact_inquiries (visible in SuperAdmin → Support),
 * then for WhatsApp opens a prefilled wa.me chat.
 */
export default function LeadCapture() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("");
  const [submitting, setSubmitting] = useState<"callback" | "whatsapp" | null>(null);
  const [done, setDone] = useState<"callback" | "whatsapp" | null>(null);
  const [error, setError] = useState("");

  function validate(): boolean {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    return true;
  }

  async function saveLead(kind: "callback" | "whatsapp"): Promise<boolean> {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: phone.replace(/\D/g, ""),
          user_type: userType || "Other",
          message:
            kind === "callback"
              ? "📞 Callback requested (pricing lead form)"
              : "💬 WhatsApp demo requested (pricing lead form)",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleCallback() {
    if (!validate()) return;
    setSubmitting("callback");
    const ok = await saveLead("callback");
    setSubmitting(null);
    if (ok) setDone("callback");
    else setError("Something went wrong. Please try again.");
  }

  async function handleWhatsApp() {
    if (!validate()) return;
    setSubmitting("whatsapp");
    // Save the lead first, but open WhatsApp even if saving fails —
    // the chat itself still reaches the business number.
    await saveLead("whatsapp");
    setSubmitting(null);
    setDone("whatsapp");
    const text = encodeURIComponent(
      `Hi! I'm ${name.trim()} (${phone.replace(/\D/g, "")}). I'd like a demo of MyRentSaathi.${
        userType ? ` I am a ${userType}.` : ""
      }`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  if (done) {
    return (
      <div className="max-w-[640px] mx-auto mt-12 bg-white rounded-2xl p-8 text-center shadow-lg">
        <div className="text-4xl mb-3">{done === "callback" ? "📞" : "💬"}</div>
        <div className="font-bold text-green-700 text-[18px] mb-1">
          {done === "callback" ? "Callback requested!" : "Opening WhatsApp..."}
        </div>
        <p className="text-[14px] text-gray-600">
          {done === "callback"
            ? "Our team will call you within 24 hours."
            : "Continue the chat on WhatsApp — we usually reply within minutes."}
        </p>
        <button
          onClick={() => {
            setDone(null);
            setName("");
            setPhone("");
            setUserType("");
          }}
          className="mt-4 text-[13px] font-bold text-brand-500 hover:text-brand-600 cursor-pointer"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
      <div className="text-center mb-5">
        <h3 className="font-serif text-[22px] font-extrabold text-ink">
          Not sure which plan fits? 🤔
        </h3>
        <p className="text-[14px] text-gray-600 mt-1">
          Leave your number — get a free callback or an instant demo on WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          placeholder="Mobile number"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <select
        value={userType}
        onChange={(e) => setUserType(e.target.value)}
        className="w-full mt-3 border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">I am a...</option>
        <option value="Landlord">Landlord</option>
        <option value="Society Committee Member">Society Committee Member</option>
        <option value="Tenant">Tenant</option>
        <option value="Other">Other</option>
      </select>

      {error && <div className="mt-3 text-[13px] text-red-600 font-medium">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <button
          onClick={handleCallback}
          disabled={submitting !== null}
          className="px-6 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold cursor-pointer hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting === "callback" ? "Sending..." : "📞 Get a Callback"}
        </button>
        <button
          onClick={handleWhatsApp}
          disabled={submitting !== null}
          className="px-6 py-3 rounded-xl bg-green-600 text-white text-[14px] font-bold cursor-pointer hover:bg-green-700 disabled:opacity-60"
        >
          {submitting === "whatsapp" ? "Saving..." : "💬 Demo on WhatsApp"}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-3">
        No spam — we only call about your query.
      </p>
    </div>
  );
}
