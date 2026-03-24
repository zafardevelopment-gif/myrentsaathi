"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/MockAuthProvider";
import {
  getAdminSocietyId,
  getSocietyPolls,
  createPoll,
  closePoll,
  type Poll,
} from "@/lib/admin-data";

const AUDIENCE_OPTIONS = [
  { value: "all",               label: "Everyone (All Members)" },
  { value: "board",             label: "Board Members Only" },
  { value: "landlords",         label: "Landlords Only" },
  { value: "tenants",           label: "Tenants Only" },
  { value: "board,landlords",   label: "Board + Landlords" },
  { value: "board,tenants",     label: "Board + Tenants" },
  { value: "landlords,tenants", label: "Landlords + Tenants" },
];

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Everyone",
  board: "Board Only",
  landlords: "Landlords Only",
  tenants: "Tenants Only",
  "board,landlords": "Board + Landlords",
  "board,tenants": "Board + Tenants",
  "landlords,tenants": "Landlords + Tenants",
};

function PollCard({ poll, onClose }: { poll: Poll; onClose: (id: string) => void }) {
  const totalVotes = poll.votes?.length ?? 0;

  return (
    <div className="bg-white rounded-[14px] p-5 border border-border-default mb-3">
      <div className="flex justify-between items-start gap-3 mb-1">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-ink">{poll.title}</div>
          {poll.description && (
            <div className="text-xs text-ink-muted mt-0.5 leading-relaxed">{poll.description}</div>
          )}
        </div>
        <StatusBadge status={poll.status} />
      </div>

      {/* Meta */}
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

      {/* Options with result bars */}
      <div className="space-y-2 mb-3">
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
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {poll.status === "active" && (
        <button
          onClick={() => onClose(poll.id)}
          className="px-3 py-1.5 rounded-xl border border-border-default text-[11px] font-semibold text-ink-muted hover:bg-warm-50 cursor-pointer transition-colors"
        >
          🔒 Close Poll
        </button>
      )}
    </div>
  );
}

export default function AdminPolls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_audience: "all",
    ends_at: "",
    options: ["", ""],
  });

  async function loadPolls(sid: string) {
    const p = await getSocietyPolls(sid);
    setPolls(p);
  }

  useEffect(() => {
    if (!user?.email) return;
    async function init() {
      try {
        const sid = await getAdminSocietyId(user!.email);
        setSocietyId(sid);
        if (sid) {
          try {
            await loadPolls(sid);
          } catch (pollErr) {
            console.error("Failed to load polls:", pollErr);
            setError((pollErr as Error).message || "Failed to load polls");
          }
        }
      } catch (err) {
        console.error("Init error:", err);
        setError((err as Error).message || "Failed to initialize");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }

  function removeOption(i: number) {
    if (form.options.length <= 2) return;
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  }

  function setOption(i: number, val: string) {
    setForm((f) => {
      const opts = [...f.options];
      opts[i] = val;
      return { ...f, options: opts };
    });
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const validOpts = form.options.filter((o) => o.trim());
    if (validOpts.length < 2) { toast.error("At least 2 options needed"); return; }
    if (!societyId || !user?.email) return;

    setSaving(true);
    try {
      // Fetch user ID from DB using email
      const { supabase } = await import("@/lib/supabase");
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!userData?.id) {
        toast.error("User not found in database");
        setSaving(false);
        return;
      }

      await createPoll(societyId, userData.id, { ...form, options: validOpts });
      toast.success("Poll launched!");
      setShowForm(false);
      setForm({ title: "", description: "", target_audience: "all", ends_at: "", options: ["", ""] });
      await loadPolls(societyId);
    } catch (err) {
      console.error("Poll creation error:", err);
      toast.error((err as Error).message ?? "Failed — check RLS policies");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(id: string) {
    try {
      await closePoll(id);
      setPolls((prev) => prev.map((p) => p.id === id ? { ...p, status: "closed" } : p));
      toast.success("Poll closed");
    } catch {
      toast.error("Failed — check RLS policies");
    }
  }

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status !== "active");

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-extrabold text-ink">🗳️ Polls & Voting</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Create Poll"}
        </button>
      </div>

      {/* Create Poll Form */}
      {showForm && (
        <div className="bg-white rounded-[14px] p-5 border border-border-default mb-5 space-y-3">
          <div className="text-[13px] font-extrabold text-ink">New Poll</div>

          <input
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            placeholder="Poll question / title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          {/* Options */}
          <div>
            <div className="text-[11px] font-bold text-ink-muted mb-1.5 uppercase tracking-wide">Options</div>
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input
                  className="flex-1 border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                {form.options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-500 text-sm cursor-pointer hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="text-[11px] font-bold text-brand-500 cursor-pointer hover:underline mt-1"
            >
              + Add option
            </button>
          </div>

          {/* Audience selector */}
          <div>
            <div className="text-[11px] font-bold text-ink-muted mb-2 uppercase tracking-wide">Who can vote?</div>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setForm((f) => ({ ...f, target_audience: a.value }))}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                    form.target_audience === a.value
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* End date */}
          <div>
            <div className="text-[11px] font-bold text-ink-muted mb-1.5 uppercase tracking-wide">End Date (optional)</div>
            <input
              type="datetime-local"
              className="border border-border-default rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 cursor-pointer"
              value={form.ends_at}
              onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold cursor-pointer disabled:opacity-50 hover:bg-brand-600 transition-colors"
          >
            {saving ? "Creating..." : "🗳️ Launch Poll"}
          </button>
        </div>
      )}

      {/* Active Polls */}
      {activePolls.length > 0 && (
        <>
          <div className="text-[13px] font-bold text-ink mb-2.5">🟢 Active ({activePolls.length})</div>
          {activePolls.map((p) => <PollCard key={p.id} poll={p} onClose={handleClose} />)}
        </>
      )}

      {/* Closed Polls */}
      {closedPolls.length > 0 && (
        <>
          <div className="text-[13px] font-bold text-ink mt-5 mb-2.5">🔒 Closed ({closedPolls.length})</div>
          {closedPolls.map((p) => <PollCard key={p.id} poll={p} onClose={handleClose} />)}
        </>
      )}

      {polls.length === 0 && !showForm && (
        <div className="text-center py-14 text-ink-muted text-sm">
          <div className="text-4xl mb-3">🗳️</div>
          No polls yet. Create the first poll for your society!
        </div>
      )}
    </div>
  );
}
