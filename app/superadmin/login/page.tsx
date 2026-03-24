"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { superAdminLogin } from "@/lib/auth-db";
import toast, { Toaster } from "react-hot-toast";

export default function SuperAdminLogin() {
  const router = useRouter();
  const { user, hydrated, login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in as superadmin, redirect to dashboard
  useEffect(() => {
    if (hydrated && user?.role === "superadmin") {
      router.push("/superadmin");
    }
  }, [hydrated, user, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await superAdminLogin(userId, password);
      if (!result.success || !result.user) {
        setError(result.error ?? "Login failed");
        setLoading(false);
        return;
      }

      // Map to MockRole and set auth context
      const loginResult = await login(result.user.email, password);
      if (!loginResult.success) {
        setError(loginResult.error ?? "Could not authenticate");
        setLoading(false);
        return;
      }

      toast.success("Welcome, Super Admin! 🚀");
      router.push("/superadmin");
    } catch (err) {
      setError((err as Error).message ?? "An error occurred");
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-brand-500 font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f00] to-[#3a2005] flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-extrabold text-white mb-2">
            🏠 MyRent<span className="text-amber-400">Saathi</span>
          </div>
          <div className="text-amber-200/60 text-sm">Platform Command Center</div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[16px] shadow-2xl overflow-hidden border border-amber-900/10">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-6">
            <div className="text-white text-lg font-extrabold">🔐 Superadmin Login</div>
            <div className="text-amber-100/70 text-xs mt-1">Secure access to platform controls</div>
          </div>

          {/* Card Body */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="text-red-600 text-xs font-semibold">⚠️ {error}</div>
              </div>
            )}

            {/* User ID Field */}
            <div>
              <label className="text-xs font-bold text-ink-muted block mb-2">User ID</label>
              <input
                type="text"
                placeholder="e.g. MRSA_ADMIN_001"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                disabled={loading}
                className="w-full border border-border-default rounded-xl px-4 py-3 text-sm text-ink bg-warm-50 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                required
              />
              <div className="text-[10px] text-ink-muted mt-1">Your unique superadmin identifier</div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-bold text-ink-muted block mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="w-full border border-border-default rounded-xl px-4 py-3 text-sm text-ink bg-warm-50 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !userId || !password}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-bold cursor-pointer transition-all hover:from-amber-700 hover:to-amber-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "🚀 Enter Command Center"}
            </button>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
              <div className="text-[11px] text-blue-700">
                <strong>First Time?</strong> Use these credentials:
                <div className="mt-1.5 space-y-0.5 font-mono text-[10px] bg-blue-100 rounded p-2">
                  <div>User ID: <strong>MRSA_ADMIN_001</strong></div>
                  <div>Password: <strong>Admin@12345</strong></div>
                </div>
                <div className="mt-1 text-blue-600">
                  Change password after first login!
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-warm-50 border-t border-border-light px-6 py-3">
            <div className="text-[10px] text-ink-muted text-center">
              🔒 This page is for superadmin access only. Unauthorized access is prohibited.
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-amber-200/60 text-[11px]">
          <div>🛡️ Encrypted connection • IP logging enabled</div>
        </div>
      </div>
    </div>
  );
}
