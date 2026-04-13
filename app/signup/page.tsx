"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signupSocietyAdmin, signupLandlord } from "@/lib/auth-db";
import { useAuth } from "@/components/providers/MockAuthProvider";
import toast, { Toaster } from "react-hot-toast";

type Tab = "society" | "landlord";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("type") === "landlord" ? "landlord" : "society"
  );
  const [loading, setLoading] = useState(false);

  // ── Society Admin form ──
  const [society, setSociety] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    society_name: "",
    society_city: "",
    society_state: "",
    society_address: "",
    total_flats: "",
    maintenance_amount: "",
  });

  // ── Landlord form ──
  const [landlord, setLandlord] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  async function handleSocietySignup(e: React.FormEvent) {
    e.preventDefault();
    if (society.password !== society.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    if (society.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (society.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    setLoading(true);
    const result = await signupSocietyAdmin({
      full_name: society.full_name,
      email: society.email,
      phone: society.phone,
      password: society.password,
      society_name: society.society_name,
      society_city: society.society_city,
      society_state: society.society_state,
      society_address: society.society_address,
      total_flats: Number(society.total_flats) || 0,
      maintenance_amount: Number(society.maintenance_amount) || 0,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Signup failed.");
      return;
    }

    toast.success("Society created! Ab apna plan chunein...");
    const loginResult = await login(society.email, society.password);
    if (loginResult.success) {
      // Redirect to plan selection with type=society and societyId
      router.push(`/select-plan?type=society&society=${result.societyId}`);
    }
  }

  async function handleLandlordSignup(e: React.FormEvent) {
    e.preventDefault();
    if (landlord.password !== landlord.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    if (landlord.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (landlord.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    setLoading(true);
    const result = await signupLandlord({
      full_name: landlord.full_name,
      email: landlord.email,
      phone: landlord.phone,
      password: landlord.password,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Signup failed.");
      return;
    }

    toast.success("Account created! Ab apna plan chunein...");
    const loginResult = await login(landlord.email, landlord.password);
    if (loginResult.success) {
      // Redirect to plan selection with type=landlord
      router.push(`/select-plan?type=landlord`);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-default text-sm outline-none focus:border-brand-500 transition-colors bg-white";
  const labelClass = "text-xs font-bold text-ink-soft mb-1.5 block";

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🏠</span>
            <span className="font-serif text-2xl font-extrabold text-ink">
              MyRent<span className="text-brand-500">Saathi</span>
            </span>
          </a>
          <div className="text-sm text-ink-muted mt-1">Create your account</div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border-default">
            <button
              onClick={() => setTab("society")}
              className={`flex-1 py-4 text-sm font-bold transition-colors cursor-pointer ${
                tab === "society"
                  ? "text-brand-500 border-b-2 border-brand-500 bg-brand-50"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🏢 Society Admin
            </button>
            <button
              onClick={() => setTab("landlord")}
              className={`flex-1 py-4 text-sm font-bold transition-colors cursor-pointer ${
                tab === "landlord"
                  ? "text-brand-500 border-b-2 border-brand-500 bg-brand-50"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🏠 Landlord
            </button>
          </div>

          <div className="p-6">
            {/* ── SOCIETY ADMIN FORM ── */}
            {tab === "society" && (
              <form onSubmit={handleSocietySignup} className="space-y-4">
                <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">Your Details</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input required className={inputClass} placeholder="Ramesh Patil"
                      value={society.full_name} onChange={e => setSociety(s => ({ ...s, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input required className={inputClass} placeholder="10-digit mobile" type="tel" maxLength={10} inputMode="numeric"
                      value={society.phone} onChange={e => setSociety(s => ({ ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input required className={inputClass} placeholder="admin@yoursociety.com" type="email"
                    value={society.email} onChange={e => setSociety(s => ({ ...s, email: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Password *</label>
                    <input required className={inputClass} placeholder="Min 6 chars" type="password"
                      value={society.password} onChange={e => setSociety(s => ({ ...s, password: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm Password *</label>
                    <input required className={inputClass} placeholder="Re-enter" type="password"
                      value={society.confirm_password} onChange={e => setSociety(s => ({ ...s, confirm_password: e.target.value }))} />
                  </div>
                </div>

                <div className="border-t border-border-light pt-4">
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Society Details</div>

                  <div className="mb-3">
                    <label className={labelClass}>Society Name *</label>
                    <input required className={inputClass} placeholder="Green Valley CHS"
                      value={society.society_name} onChange={e => setSociety(s => ({ ...s, society_name: e.target.value }))} />
                  </div>

                  <div className="mb-3">
                    <label className={labelClass}>Address</label>
                    <input className={inputClass} placeholder="Plot 45, Sector 21, Andheri West"
                      value={society.society_address} onChange={e => setSociety(s => ({ ...s, society_address: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={labelClass}>City *</label>
                      <input required className={inputClass} placeholder="Mumbai"
                        value={society.society_city} onChange={e => setSociety(s => ({ ...s, society_city: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <input required className={inputClass} placeholder="Maharashtra"
                        value={society.society_state} onChange={e => setSociety(s => ({ ...s, society_state: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Total Flats</label>
                      <input className={inputClass} placeholder="120" type="number" min="1"
                        value={society.total_flats} onChange={e => setSociety(s => ({ ...s, total_flats: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelClass}>Monthly Maintenance (₹)</label>
                      <input className={inputClass} placeholder="3500" type="number" min="0"
                        value={society.maintenance_amount} onChange={e => setSociety(s => ({ ...s, maintenance_amount: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-[14px] text-[15px] font-bold cursor-pointer bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_20px_rgba(194,102,10,0.3)] disabled:opacity-60 mt-2"
                >
                  {loading ? "Creating Society..." : "Create Society & Sign Up →"}
                </button>
              </form>
            )}

            {/* ── LANDLORD FORM ── */}
            {tab === "landlord" && (
              <form onSubmit={handleLandlordSignup} className="space-y-4">
                <div className="text-xs text-ink-muted bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                  Sign up as a landlord. Add your properties and tenants from the dashboard.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input required className={inputClass} placeholder="Vikram Malhotra"
                      value={landlord.full_name} onChange={e => setLandlord(l => ({ ...l, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input required className={inputClass} placeholder="10-digit mobile" type="tel" maxLength={10} inputMode="numeric"
                      value={landlord.phone} onChange={e => setLandlord(l => ({ ...l, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input required className={inputClass} placeholder="you@gmail.com" type="email"
                    value={landlord.email} onChange={e => setLandlord(l => ({ ...l, email: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Password *</label>
                    <input required className={inputClass} placeholder="Min 6 chars" type="password"
                      value={landlord.password} onChange={e => setLandlord(l => ({ ...l, password: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm Password *</label>
                    <input required className={inputClass} placeholder="Re-enter" type="password"
                      value={landlord.confirm_password} onChange={e => setLandlord(l => ({ ...l, confirm_password: e.target.value }))} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-[14px] text-[15px] font-bold cursor-pointer bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_20px_rgba(194,102,10,0.3)] disabled:opacity-60 mt-2"
                >
                  {loading ? "Creating Account..." : "Create Landlord Account →"}
                </button>
              </form>
            )}

            <div className="mt-5 text-center">
              <span className="text-xs text-ink-muted">Already have an account? </span>
              <button
                onClick={() => router.push("/")}
                className="text-xs font-bold text-brand-500 cursor-pointer hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-ink-muted">
          Board members & tenants are added by admin/landlord from the dashboard.
        </div>
      </div>
    </div>
  );
}
