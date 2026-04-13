"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type MockRole } from "@/components/providers/MockAuthProvider";
import Sidebar from "./Sidebar";
import DashHeader from "./DashHeader";
import { supabase } from "@/lib/supabase";
import { getUserSubscription, isSubscriptionValid, markSubscriptionExpired } from "@/lib/subscription";

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
  // null = loading, true/false = resolved
  const [hasSociety, setHasSociety] = useState<boolean | null>(null);
  // null = checking, true = valid, false = blocked
  const [subChecked, setSubChecked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      if (role === "superadmin") router.push("/superadmin/login");
      else router.push("/");
    } else if (user.role !== role) {
      const dest = user.role === "superadmin" ? "/superadmin" : `/${user.role}`;
      router.push(dest);
    }
  }, [hydrated, user, role, router]);

  // Subscription check for admin and landlord only
  useEffect(() => {
    if (!hydrated || !user) return;
    // Only check for roles that need a subscription
    if (role !== "admin" && role !== "landlord") {
      setSubChecked(true);
      return;
    }
    async function checkSubscription() {
      const sub = await getUserSubscription(user!.id);
      if (!sub) {
        // No subscription at all → send to plan selection
        const planType = role === "admin" ? "society" : "landlord";
        router.push(`/select-plan?type=${planType}`);
        return;
      }
      const valid = isSubscriptionValid(sub);
      if (!valid) {
        // Mark expired in DB if not already
        if (sub.status !== "expired" && sub.status !== "cancelled") {
          await markSubscriptionExpired(sub.id);
        }
        setSubChecked(false);
        router.push("/plan-expired");
        return;
      }
      setSubChecked(true);
    }
    checkSubscription();
  }, [hydrated, user, role, router]);

  // For landlord/tenant: check if they belong to any society
  useEffect(() => {
    if (!hydrated || !user || (role !== "landlord" && role !== "tenant")) {
      setHasSociety(true); // other roles always show full nav
      return;
    }
    async function checkSociety() {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("email", user!.email)
        .maybeSingle();
      if (!userRow) { setHasSociety(false); return; }

      const { data } = await supabase
        .from("society_members")
        .select("society_id")
        .eq("user_id", userRow.id)
        .limit(1)
        .maybeSingle();
      setHasSociety(!!data?.society_id);
    }
    checkSociety();
  }, [hydrated, user, role]);

  if (!hydrated || ((role === "admin" || role === "landlord") && subChecked === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-brand-500 font-bold text-sm">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== role) return null;
  // If subscription check failed, null while redirecting
  if ((role === "admin" || role === "landlord") && subChecked === false) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        hasSociety={hasSociety ?? true}
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
