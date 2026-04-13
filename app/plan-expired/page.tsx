"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";

export default function PlanExpiredPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const planType = user?.role === "admin" ? "society" : "landlord";

  function handleRenew() {
    const societyParam = ""; // society_id stored in subscription, not needed here
    router.push(`/select-plan?type=${planType}`);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="text-6xl mb-4">⏰</div>

        {/* Heading */}
        <h1 className="text-2xl font-extrabold text-white mb-2">
          Aapka Plan Expire Ho Gaya
        </h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Aapka subscription plan active nahi hai. Apna plan renew karein — aapka
          sabhi data safe hai aur plan activate hone ke baad wapas milega.
        </p>

        {/* Plan info box */}
        <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-6 text-left">
          <div className="text-xs text-gray-500 mb-1">Logged in as</div>
          <div className="text-sm font-bold text-white">{user?.name}</div>
          <div className="text-xs text-gray-400">{user?.email}</div>
        </div>

        {/* Data safe notice */}
        <div className="bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-3 mb-6 text-left">
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-base mt-0.5">✓</span>
            <div>
              <div className="text-xs font-bold text-green-400 mb-0.5">Aapka data safe hai</div>
              <div className="text-xs text-green-300/70">
                Societies, tenants, payments — sab records preserve hain. Plan activate karne ke baad sab wapas accessible hoga.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRenew}
            className="w-full py-3.5 rounded-xl bg-[#e07b2e] text-white font-bold text-sm hover:bg-[#c96d24] transition-colors cursor-pointer"
          >
            Plan Renew Karein / Naya Plan Chunein →
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl border border-[#3a3a3a] text-gray-400 text-sm font-medium hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>

        <p className="text-[11px] text-gray-600 mt-6">
          Support chahiye?{" "}
          <a href="mailto:support@myrentsaathi.com" className="text-[#e07b2e] hover:underline">
            support@myrentsaathi.com
          </a>
        </p>
      </div>
    </div>
  );
}
