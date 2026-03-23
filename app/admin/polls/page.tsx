"use client";

import StatusBadge from "@/components/dashboard/StatusBadge";
import { MOCK_POLLS } from "@/lib/mockData";

export default function AdminPolls() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🗳️ Polls & Voting</h2>
        <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer">+ Create Poll</button>
      </div>

      {MOCK_POLLS.map((poll) => {
        const totalVotes = Object.values(poll.votes).reduce((a, b) => a + b, 0);
        return (
          <div key={poll.id} className="bg-white rounded-[14px] p-5 border border-border-default mb-3">
            <div className="flex justify-between items-center mb-2.5">
              <div className="text-[15px] font-bold text-ink">{poll.title}</div>
              <StatusBadge status={poll.status} />
            </div>
            <div className="text-xs text-ink-muted mb-2.5">{poll.desc} • Ends: {poll.ends} • {totalVotes}/{poll.totalVoters} voted</div>
            {poll.options.map((opt) => {
              const votes = poll.votes[opt.id as keyof typeof poll.votes] || 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <div key={opt.id} className="mb-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink mb-0.5">
                    <span>{opt.text}</span>
                    <span>{votes} votes ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-brand-500 rounded transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
