"use client";

import { useState } from "react";
import { useAuth, DEMO_CREDENTIALS } from "@/components/providers/MockAuthProvider";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (role: string) => void;
}

export default function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (!result.success) {
        setError(result.error || "Invalid email or password.");
        return;
      }
      // Find role to redirect
      const match = DEMO_CREDENTIALS.find(
        (c) => c.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (match) onLogin(match.role);
    }, 300);
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
            <label className="text-xs font-bold text-ink-soft mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
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

        {/* Demo credentials */}
        <div className="mt-5 p-3.5 rounded-xl bg-warm-50 border border-border-light">
          <div className="text-[11px] font-bold text-ink-soft mb-2 uppercase tracking-wide">Demo Credentials</div>
          <div className="space-y-1">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => { setEmail(c.email); setPassword(c.password); setError(""); }}
                className="w-full flex justify-between items-center text-[11px] hover:bg-white rounded-lg px-2 py-1 transition-colors cursor-pointer group"
              >
                <span className="font-semibold text-ink group-hover:text-brand-500 transition-colors">{c.name}</span>
                <span className="text-ink-muted font-mono">{c.email}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-ink-muted mt-2">↑ Click a row to auto-fill credentials</div>
        </div>
      </div>
    </div>
  );
}
