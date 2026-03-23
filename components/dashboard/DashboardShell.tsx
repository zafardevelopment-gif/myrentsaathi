"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MockAuthProvider,
  useAuth,
  type MockRole,
} from "@/components/providers/MockAuthProvider";
import Sidebar from "./Sidebar";
import DashHeader from "./DashHeader";

function DashboardContent({
  role,
  children,
}: {
  role: MockRole;
  children: React.ReactNode;
}) {
  const { user, login } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-login with the role from the URL
  useEffect(() => {
    if (mounted && !user) {
      login(role);
    }
  }, [mounted, user, role, login]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-brand-500 font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <DashHeader />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-[1000px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardShell({
  role,
  children,
}: {
  role: MockRole;
  children: React.ReactNode;
}) {
  return (
    <MockAuthProvider>
      <DashboardContent role={role}>{children}</DashboardContent>
    </MockAuthProvider>
  );
}
