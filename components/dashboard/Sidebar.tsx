"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  requiresSociety?: boolean; // hide if user has no society
}

const NAV_ITEMS: Record<MockRole, NavItem[]> = {
  superadmin: [
    { icon: "📊", label: "Overview",      href: "/superadmin" },
    { icon: "🏢", label: "Societies",     href: "/superadmin/societies" },
    { icon: "💰", label: "Revenue",       href: "/superadmin/revenue" },
    { icon: "👥", label: "Users",         href: "/superadmin/users" },
    { icon: "📋", label: "Subscriptions", href: "/superadmin/subscriptions" },
    { icon: "💎", label: "Pricing",       href: "/superadmin/pricing" },
    { icon: "🤝", label: "Agents",        href: "/superadmin/agents" },
    { icon: "🏷️", label: "Promos",       href: "/superadmin/promos" },
    { icon: "📈", label: "Analytics",     href: "/superadmin/analytics" },
    { icon: "💬", label: "Support",       href: "/superadmin/support" },
    { icon: "⚙️", label: "Settings",     href: "/superadmin/settings" },
  ],
  admin: [
    { icon: "📊", label: "Overview",   href: "/admin" },
    { icon: "🏢", label: "Flats",      href: "/admin/flats" },
    { icon: "🏠", label: "Landlords",  href: "/admin/landlords" },
    { icon: "📋", label: "Expenses",   href: "/admin/expenses" },
    { icon: "🚪", label: "Visitors",   href: "/admin/visitors" },
    { icon: "🅿️", label: "Parking",   href: "/admin/parking" },
    { icon: "👷", label: "Staff",      href: "/admin/staff" },
    { icon: "🏛️", label: "Facilities", href: "/admin/facilities" },
    { icon: "🗳️", label: "Polls",     href: "/admin/polls" },
    { icon: "📢", label: "Notices",    href: "/admin/notices" },
    { icon: "🚫", label: "Tickets",    href: "/admin/tickets" },
    { icon: "📁", label: "Documents",  href: "/admin/documents" },
    { icon: "⚖️", label: "Governance", href: "/admin/governance" },
    { icon: "📊", label: "Reports",    href: "/admin/reports" },
    { icon: "⚙️", label: "Settings",  href: "/admin/settings" },
  ],
  landlord: [
    { icon: "📊", label: "Overview",     href: "/landlord" },
    { icon: "🏠", label: "Properties",   href: "/landlord/properties" },
    { icon: "👥", label: "Tenants",      href: "/landlord/tenants" },
    { icon: "💰", label: "Rent",         href: "/landlord/rent" },
    { icon: "📈", label: "Rent Hike",    href: "/landlord/rent-hike" },
    { icon: "🏢", label: "Society Dues", href: "/landlord/society-dues",  requiresSociety: true },
    { icon: "📄", label: "Agreements",   href: "/landlord/agreements" },
    { icon: "📜", label: "NOC",          href: "/landlord/noc" },
    { icon: "🚪", label: "Visitors",     href: "/landlord/visitors",      requiresSociety: true },
    { icon: "🅿️", label: "Parking",     href: "/landlord/parking",       requiresSociety: true },
    { icon: "🏛️", label: "Facilities",  href: "/landlord/facilities",    requiresSociety: true },
    { icon: "🚫", label: "Complaints",   href: "/landlord/complaints" },
    { icon: "📢", label: "Notices",      href: "/landlord/notices" },
    { icon: "💬", label: "WhatsApp",     href: "/landlord/whatsapp" },
    { icon: "🗳️", label: "Polls",       href: "/landlord/polls",         requiresSociety: true },
    { icon: "📊", label: "Reports",      href: "/landlord/reports" },
    { icon: "🔧", label: "Expenses",     href: "/landlord/expenses" },
    { icon: "📁", label: "Documents",   href: "/landlord/documents",     requiresSociety: true },
    { icon: "⚖️", label: "Governance",  href: "/landlord/governance",    requiresSociety: true },
    { icon: "⚙️", label: "Settings",    href: "/landlord/settings" },
  ],
  tenant: [
    { icon: "🏠", label: "Home",        href: "/tenant" },
    { icon: "💰", label: "Payments",    href: "/tenant/payments" },
    { icon: "📄", label: "Agreement",   href: "/tenant/agreement" },
    { icon: "🚪", label: "Visitors",    href: "/tenant/visitors",      requiresSociety: true },
    { icon: "🅿️", label: "Parking",    href: "/tenant/parking",       requiresSociety: true },
    { icon: "🏛️", label: "Facilities", href: "/tenant/facilities",    requiresSociety: true },
    { icon: "🚫", label: "Complaints",  href: "/tenant/complaints" },
    { icon: "📢", label: "Notices",     href: "/tenant/notices" },
    { icon: "🗳️", label: "Polls",      href: "/tenant/polls",         requiresSociety: true },
    { icon: "📁", label: "Documents",   href: "/tenant/documents" },
    { icon: "⚖️", label: "Governance",  href: "/tenant/governance",    requiresSociety: true },
    { icon: "👤", label: "Profile",     href: "/tenant/profile" },
  ],
  board: [
    { icon: "🚫", label: "My Tickets", href: "/board" },
    { icon: "📋", label: "Approvals",  href: "/board/approvals" },
    { icon: "📢", label: "Notices",    href: "/board/notices" },
    { icon: "🗳️", label: "Polls",     href: "/board/polls" },
  ],
  guard: [
    { icon: "🏠", label: "Gate Entry",  href: "/guard" },
    { icon: "⏳", label: "Pending",     href: "/guard/pending" },
    { icon: "📋", label: "Today's Log", href: "/guard/log" },
    { icon: "🚗", label: "Vehicle Check", href: "/guard/parking" },
  ],
};

// First 5 items shown in bottom nav on mobile
const BOTTOM_NAV_COUNT = 5;

interface SidebarProps {
  role: MockRole;
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  hasSociety?: boolean;
}

export default function Sidebar({
  role,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onMobileClose,
  hasSociety = true,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const allItems = NAV_ITEMS[role] || [];
  const items = allItems.filter(item => !item.requiresSociety || hasSociety);

  const rootHref = role === "superadmin" ? "/superadmin" : `/${role}`;
  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== rootHref && pathname.startsWith(item.href));

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isActive(item)
              ? "bg-brand-100 text-brand-500"
              : "text-ink-muted hover:bg-warm-50 hover:text-ink"
          }`}
          title={collapsed ? item.label : undefined}
        >
          <span className="text-lg flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside
        className={`hidden md:flex bg-white border-r border-border-default h-screen sticky top-0 transition-all duration-300 flex-col ${
          collapsed ? "w-[68px]" : "w-[220px]"
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

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Logout */}
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="mx-2 mb-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-3 cursor-pointer"
          >
            <span className="text-lg">🚪</span>
            <span>Sign Out</span>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="hidden lg:flex h-10 items-center justify-center border-t border-border-light text-ink-muted hover:text-ink cursor-pointer transition-colors"
        >
          {collapsed ? "→" : "←"}
        </button>
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-white flex flex-col md:hidden shadow-2xl">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border-light">
              <Link href="/" className="flex items-center gap-2" onClick={onMobileClose}>
                <span className="text-xl">🏠</span>
                <span className="font-serif text-lg font-extrabold text-ink">
                  MyRent<span className="text-brand-500">Saathi</span>
                </span>
              </Link>
              <button
                onClick={onMobileClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-warm-50 cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 overflow-y-auto">
              <NavLinks onClose={onMobileClose} />
            </nav>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="mx-2 mb-4 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-3 cursor-pointer"
            >
              <span className="text-lg">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border-default flex md:hidden">
        {items.slice(0, BOTTOM_NAV_COUNT).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive(item) ? "text-brand-500" : "text-ink-muted"
            }`}
          >
            <span className={`text-[20px] leading-none ${isActive(item) ? "" : "opacity-50"}`}>
              {item.icon}
            </span>
            <span className={`text-[9px] font-semibold leading-none ${isActive(item) ? "text-brand-500" : "text-ink-muted"}`}>
              {item.label.split(" ")[0]}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
