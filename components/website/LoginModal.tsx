"use client";

import { useState } from "react";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (role: string) => void;
}

const ROLES = [
  { id: "admin", icon: "🏛", label: "Society Admin", color: "brand" },
  { id: "board", icon: "🏗️", label: "Board Member", color: "purple" },
  { id: "landlord", icon: "👨‍💼", label: "Landlord", color: "forest" },
  { id: "tenant", icon: "🏡", label: "Tenant", color: "blue" },
];

const ROLE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  brand: {
    border: "border-brand-500",
    bg: "bg-brand-50",
    text: "text-brand-500",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-600",
  },
  forest: {
    border: "border-forest-500",
    bg: "bg-forest-50",
    text: "text-forest-500",
  },
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
};

export default function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-10 max-w-[420px] w-full shadow-[0_24px_80px_rgba(0,0,0,0.3)] animate-fade-up"
      >
        {/* Header */}
        <div className="text-center mb-7">
          <span className="text-4xl">🏠</span>
          <div className="font-serif text-2xl font-extrabold text-ink mt-2">
            Login to MyRentSaathi
          </div>
        </div>

        {/* Role Selector */}
        <div className="text-[13px] font-bold text-ink-soft mb-1.5">
          Select Your Role:
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {ROLES.map((role) => {
            const colors = ROLE_COLORS[role.color];
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`py-3.5 px-3 rounded-[14px] cursor-pointer text-center transition-all ${
                  isSelected
                    ? `border-2 ${colors.border} ${colors.bg}`
                    : "border border-border-default bg-white hover:border-brand-300"
                }`}
              >
                <div className="text-[22px]">{role.icon}</div>
                <div
                  className={`text-[13px] font-bold mt-1 ${
                    isSelected ? colors.text : "text-ink-soft"
                  }`}
                >
                  {role.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Email Input */}
        <div className="mb-3.5">
          <label className="text-xs font-bold text-ink-soft mb-1 block">
            Email or Phone
          </label>
          <input
            placeholder="Enter email or phone"
            className="w-full px-4 py-3 rounded-xl border border-border-default text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Password Input */}
        <div className="mb-5">
          <label className="text-xs font-bold text-ink-soft mb-1 block">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-xl border border-border-default text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Login Button */}
        <button
          onClick={() => {
            if (selectedRole) onLogin(selectedRole);
          }}
          disabled={!selectedRole}
          className={`w-full py-3.5 rounded-[14px] text-[15px] font-bold cursor-pointer transition-all ${
            selectedRole
              ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_4px_20px_rgba(194,102,10,0.3)]"
              : "bg-gray-200 text-ink-muted cursor-not-allowed"
          }`}
        >
          Login →
        </button>

        {/* Footer */}
        <div className="text-center mt-3.5">
          <span className="text-[13px] text-ink-muted">New here? </span>
          <span className="text-[13px] text-brand-500 font-bold cursor-pointer hover:underline">
            Start Free Trial
          </span>
        </div>
      </div>
    </div>
  );
}
