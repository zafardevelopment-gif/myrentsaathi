"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";
import Sidebar from "./Sidebar";
import DashHeader from "./DashHeader";

export default function DashboardShell({
  role,
  children,
}: {
  role: MockRole;
  children: React.ReactNode;
}) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/");
    } else if (user.role !== role) {
      router.push(`/${user.role}`);
    }
  }, [hydrated, user, role, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-brand-500 font-bold text-sm">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== role) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <DashHeader onMenuClick={() => setMobileOpen(true)} />
        {/* pb-20 on mobile so content isn't hidden behind bottom nav */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-[1000px] w-full mx-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
