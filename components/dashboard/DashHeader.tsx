"use client";

import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";

const ROLE_LABELS: Record<MockRole, { label: string; color: string; bg: string }> = {
  superadmin: { label: "Super Admin", color: "text-amber-600",  bg: "bg-amber-100"  },
  admin:      { label: "Admin",       color: "text-brand-500",  bg: "bg-brand-100"  },
  board:      { label: "Board",       color: "text-purple-600", bg: "bg-purple-100" },
  landlord:   { label: "Landlord",    color: "text-green-700",  bg: "bg-green-100"  },
  tenant:     { label: "Tenant",      color: "text-blue-600",   bg: "bg-blue-100"   },
};

interface DashHeaderProps {
  onMenuClick?: () => void;
}

export default function DashHeader({ onMenuClick }: DashHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

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
        {/* Hamburger — only on mobile */}
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

      {/* Right: role badge + logout */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-2xl text-[10px] font-bold tracking-wide ${roleInfo.color} ${roleInfo.bg}`}>
          {roleInfo.label}
        </span>
        <button
          onClick={handleLogout}
          className="hidden sm:flex px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer transition-colors"
        >
          ← Exit
        </button>
        {/* Mobile: icon-only logout */}
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
