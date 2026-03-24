"use client";

/**
 * Shared Polls View — used by tenant, landlord, board pages.
 * Shows polls targeted at the user's role. User can vote (one vote per poll).
 */

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { getPollsForRole, castVote, type Poll } from "@/lib/admin-data";

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Everyone",
  board: "Board Only",
  landlords: "Landlords Only",
  tenants: "Tenants Only",
  "board,landlords": "Board + Landlords",
  "board,tenants": "Board + Tenants",
  "landlords,tenants": "Landlords + Tenants",
};

interface PollsViewProps {
  societyId: string;
  voterId: string;       // DB user.id of logged-in user
  role: string;          // 'tenant' | 'landlord' | 'board'
}

export default function PollsView({ societyId, voterId, role }: PollsViewProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);   // poll id being voted

  async function load() {
    const p = await getPollsForRole(societyId, role);
    setPolls(p);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [societyId, role]);

  async function handleVote(pollId: string, optionId: string) {
    setVoting(pollId);
    try {
      await castVote(pollId, optionId, voterId);
      toast.success("Vote recorded!");
      // Refresh to see updated counts
      const updated = await getPollsForRole(societyId, role);
      setPolls(updated);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("You have already voted in this poll");
      } else {
        toast.error("Failed to cast vote");
      }
    } finally {
      setVoting(null);
    }
  }

  const hasVoted = (poll: Poll) =>
    (poll.votes ?? []).some((v) => v.voter_id === voterId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status !== "active");

  if (polls.length === 0) {
    return (
      <div className="text-center py-14 text-ink-muted text-sm">
        <div className="text-4xl mb-3">🗳️</div>
        No polls for you right now. Check back later!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activePolls.length > 0 && (
        <>
          <div className="text-[13px] font-bold text-ink mb-1">🟢 Active ({activePolls.length})</div>
          {activePolls.map((poll) => {
            const voted = hasVoted(poll);
            const totalVotes = poll.votes?.length ?? 0;
            const isVoting = voting === poll.id;

            return (
              <div key={poll.id} className="bg-white rounded-[14px] p-5 border border-border-default">
                <div className="flex justify-between items-start gap-3 mb-1">
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-ink">{poll.title}</div>
                    {poll.description && (
                      <div className="text-xs text-ink-muted mt-0.5 leading-relaxed">{poll.description}</div>
                    )}
                  </div>
                  <StatusBadge status={poll.status} />
                </div>

                <div className="flex gap-2 flex-wrap mb-3 mt-1">
                  <span className="inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold bg-purple-100 text-purple-700">
                    👥 {AUDIENCE_LABEL[poll.target_audience] ?? poll.target_audience}
                  </span>
                  {poll.ends_at && (
                    <span className="inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold bg-blue-100 text-blue-700">
                      Ends {new Date(poll.ends_at).toLocaleDateString("en-IN")}
                    </span>
                  )}
                  <span className="inline-block px-2 py-[3px] rounded-2xl text-[10px] font-bold bg-gray-100 text-gray-600">
                    {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Options — vote or show results */}
                <div className="space-y-2">
                  {(poll.options ?? []).map((opt) => {
                    const voteCount = (poll.votes ?? []).filter((v) => v.option_id === opt.id).length;
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                    if (voted) {
                      // Show result bars after voting
                      return (
                        <div key={opt.id}>
                          <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                            <span>{opt.option_text}</span>
                            <span className="text-ink-muted">{voteCount} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    }

                    // Show vote button
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(poll.id, opt.id)}
                        disabled={isVoting}
                        className="w-full text-left px-4 py-2.5 rounded-xl border border-border-default text-sm font-semibold text-ink hover:bg-brand-50 hover:border-brand-300 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isVoting ? "..." : opt.option_text}
                      </button>
                    );
                  })}
                </div>

                {voted && (
                  <div className="mt-2 text-[11px] text-green-600 font-semibold">✓ You have voted</div>
                )}
              </div>
            );
          })}
        </>
      )}

      {closedPolls.length > 0 && (
        <>
          <div className="text-[13px] font-bold text-ink mt-4 mb-1">🔒 Closed ({closedPolls.length})</div>
          {closedPolls.map((poll) => {
            const totalVotes = poll.votes?.length ?? 0;
            return (
              <div key={poll.id} className="bg-white rounded-[14px] p-5 border border-border-default opacity-80">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="text-[14px] font-bold text-ink">{poll.title}</div>
                  <StatusBadge status="closed" />
                </div>
                <div className="text-[11px] text-ink-muted mb-3">{totalVotes} total votes</div>
                <div className="space-y-2">
                  {(poll.options ?? []).map((opt) => {
                    const voteCount = (poll.votes ?? []).filter((v) => v.option_id === opt.id).length;
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    return (
                      <div key={opt.id}>
                        <div className="flex justify-between text-xs font-semibold text-ink mb-1">
                          <span>{opt.option_text}</span>
                          <span className="text-ink-muted">{voteCount} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
