"use client";

import { useEffect, useState } from "react";
import PollsView from "@/components/dashboard/PollsView";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getBoardMemberProfile } from "@/lib/tenant-data";

export default function BoardPolls() {
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    async function init() {
      const profile = await getBoardMemberProfile(user!.email);
      setSocietyId(profile?.society_id ?? null);
      setVoterId(profile?.user_id ?? null);
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
        <div className="text-yellow-700 font-bold">⚠️ Board profile not found</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">🗳️ Society Polls</h2>
      <PollsView societyId={societyId} voterId={voterId} role="board" />
    </div>
  );
}
