"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (role: string) => void;
}

export default function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email (or User ID) and password.");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Invalid email or password.");
      return;
    }
    // Re-read from localStorage to get role for redirect
    try {
      const stored = localStorage.getItem("mrs_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        onLogin(parsed.role);
      }
    } catch {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-[420px] w-full shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl">🏠</span>
          <div className="font-serif text-2xl font-extrabold text-ink mt-2">
            Login to MyRentSaathi
          </div>
          <div className="text-xs text-ink-muted mt-1">Enter your credentials to continue</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3.5">
            <label className="text-xs font-bold text-ink-soft mb-1.5 block">Email or User ID</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com or LND-1234"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-border-default text-sm outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-ink-soft mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-border-default text-sm outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-[14px] text-[15px] font-bold cursor-pointer transition-all bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_20px_rgba(194,102,10,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <span className="text-xs text-ink-muted">Don't have an account? </span>
          <button
            onClick={() => { onClose(); router.push("/signup"); }}
            className="text-xs font-bold text-brand-500 cursor-pointer hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
