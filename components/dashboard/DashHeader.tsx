"use client";

import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

const ROLE_LABELS: Record<MockRole, { label: string; color: string; bg: string }> = {
  superadmin: { label: "Super Admin", color: "text-amber-600",  bg: "bg-amber-100"  },
  admin:      { label: "Admin",       color: "text-brand-500",  bg: "bg-brand-100"  },
  board:      { label: "Board",       color: "text-purple-600", bg: "bg-purple-100" },
  landlord:   { label: "Landlord",    color: "text-green-700",  bg: "bg-green-100"  },
  tenant:     { label: "Tenant",      color: "text-blue-600",   bg: "bg-blue-100"   },
  guard:      { label: "Guard",       color: "text-gray-700",   bg: "bg-gray-100"   },
};

interface DashHeaderProps {
  onMenuClick?: () => void;
}

export default function DashHeader({ onMenuClick }: DashHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="h-14 bg-white border-b border-border-default px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left: hamburger (mobile) + name */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-warm-50 cursor-pointer text-ink-muted transition-colors"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect y="3"  width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="9"  width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>

        <div>
          <div className="text-sm font-bold text-ink leading-tight">{user.name}</div>
          <div className="text-[10px] text-ink-muted leading-tight hidden sm:block">{user.email}</div>
        </div>
      </div>

      {/* Right: role badge + theme toggle + logout */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-2xl text-[10px] font-bold tracking-wide ${roleInfo.color} ${roleInfo.bg}`}>
          {roleInfo.label}
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border-default hover:bg-warm-50 cursor-pointer transition-colors text-ink-muted"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="hidden sm:flex px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer transition-colors"
        >
          ← Exit
        </button>
        <button
          onClick={handleLogout}
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-xl border border-border-default text-ink-muted cursor-pointer"
          title="Sign out"
        >
          🚪
        </button>
      </div>
    </header>
  );
}
