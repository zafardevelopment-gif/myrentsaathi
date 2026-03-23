"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MockRole } from "@/components/providers/MockAuthProvider";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const NAV_ITEMS: Record<MockRole, NavItem[]> = {
  admin: [
    { icon: "📊", label: "Overview", href: "/admin" },
    { icon: "🏢", label: "Flats", href: "/admin/flats" },
    { icon: "💰", label: "Finance", href: "/admin/finance" },
    { icon: "📋", label: "Expenses", href: "/admin/expenses" },
    { icon: "🚫", label: "Tickets", href: "/admin/tickets" },
    { icon: "🅿️", label: "Parking", href: "/admin/parking" },
    { icon: "🗳️", label: "Polls", href: "/admin/polls" },
    { icon: "📢", label: "Notices", href: "/admin/notices" },
    { icon: "📁", label: "Documents", href: "/admin/documents" },
    { icon: "⚖️", label: "Governance", href: "/admin/governance" },
    { icon: "⚙️", label: "Settings", href: "/admin/settings" },
  ],
  landlord: [
    { icon: "📊", label: "Overview", href: "/landlord" },
    { icon: "🏠", label: "Properties", href: "/landlord/properties" },
    { icon: "👥", label: "Tenants", href: "/landlord/tenants" },
    { icon: "💰", label: "Rent", href: "/landlord/rent" },
    { icon: "🏢", label: "Society Dues", href: "/landlord/society-dues" },
    { icon: "📄", label: "Agreements", href: "/landlord/agreements" },
    { icon: "🚫", label: "Complaints", href: "/landlord/complaints" },
    { icon: "📊", label: "Reports", href: "/landlord/reports" },
    { icon: "⚙️", label: "Settings", href: "/landlord/settings" },
  ],
  tenant: [
    { icon: "🏠", label: "Home", href: "/tenant" },
    { icon: "💰", label: "Payments", href: "/tenant/payments" },
    { icon: "🚫", label: "Complaints", href: "/tenant/complaints" },
    { icon: "📢", label: "Notices", href: "/tenant/notices" },
    { icon: "📁", label: "Documents", href: "/tenant/documents" },
    { icon: "👤", label: "Profile", href: "/tenant/profile" },
  ],
  board: [
    { icon: "🚫", label: "My Tickets", href: "/board" },
    { icon: "📋", label: "Approvals", href: "/board/approvals" },
    { icon: "📢", label: "Notices", href: "/board/notices" },
  ],
};

interface SidebarProps {
  role: MockRole;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ role, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] || [];

  return (
    <aside
      className={`bg-white border-r border-border-default h-screen sticky top-0 transition-all duration-300 flex flex-col ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border-light">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <span className="text-xl flex-shrink-0">🏠</span>
          {!collapsed && (
            <span className="font-serif text-lg font-extrabold text-ink whitespace-nowrap">
              MyRent<span className="text-brand-500">Saathi</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-brand-100 text-brand-500"
                  : "text-ink-muted hover:bg-warm-50 hover:text-ink"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="hidden lg:flex h-10 items-center justify-center border-t border-border-light text-ink-muted hover:text-ink cursor-pointer transition-colors"
      >
        {collapsed ? "→" : "←"}
      </button>
    </aside>
  );
}
