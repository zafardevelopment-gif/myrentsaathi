"use client";

import { useEffect, useState } from "react";
import PollsView from "@/components/dashboard/PollsView";
import { useAuth } from "@/components/providers/MockAuthProvider";

export default function LandlordPolls() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function init() {
      const { supabase } = await import("@/lib/supabase");
      // Get user id
      const { data: u } = await supabase.from("users").select("id").eq("email", user!.email).single();
      setVoterId(u?.id ?? null);
      if (u?.id) {
        // Get their society via owned flat (any flat they own)
        const { data: flat } = await supabase
          .from("flats")
          .select("society_id")
          .eq("owner_id", u.id)
          .limit(1)
          .single();
        setSocietyId(flat?.society_id ?? null);
      }
      setLoading(false);
    }
    init().catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (!societyId || !voterId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-[14px] p-6 text-center">
        <div className="text-yellow-700 font-bold">⚠️ No society linked to your properties</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🗳️ Society Polls</h2>
      <PollsView societyId={societyId} voterId={voterId} role="landlord" />
    </div>
  );
}
