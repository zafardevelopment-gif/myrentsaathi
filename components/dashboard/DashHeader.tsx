"use client";

import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";

const ROLE_LABELS: Record<MockRole, { label: string; color: string; bg: string }> = {
  admin: { label: "ADMIN", color: "text-brand-500", bg: "bg-brand-100" },
  board: { label: "BOARD", color: "text-purple-600", bg: "bg-purple-100" },
  landlord: { label: "LANDLORD", color: "text-forest-500", bg: "bg-forest-50" },
  tenant: { label: "TENANT", color: "text-blue-600", bg: "bg-blue-100" },
};

export default function DashHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="h-16 bg-white border-b border-border-default px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div>
          <span className="text-sm font-bold text-ink">{user.name}</span>
          <span className="text-xs text-ink-muted ml-2">{user.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`inline-block px-3 py-1 rounded-2xl text-[10px] font-bold tracking-wider ${roleInfo.color} ${roleInfo.bg}`}
        >
          {roleInfo.label}
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl border border-border-default text-sm font-semibold text-ink-muted hover:text-ink hover:border-ink-muted cursor-pointer transition-colors"
        >
          ← Back to Website
        </button>
      </div>
    </header>
  );
}
