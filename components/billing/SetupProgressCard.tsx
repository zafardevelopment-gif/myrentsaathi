"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";

type Step = { key: string; title: string; status: "not_started" | "in_progress" | "completed"; required: boolean; href: string; hint?: string };
type Progress = { percent: number; completed: boolean; nextStepHref: string | null; steps: Step[] };

/** Dashboard Setup Progress card (§33A). Matches the app's warm/brand theme. */
export default function SetupProgressCard() {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !user) return;
    fetch(`/api/onboarding/progress?userId=${user.id}&role=${user.role}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [hydrated, user]);

  if (loading || !data || data.completed || !data.steps?.length) return null;

  const icon = (s: Step["status"]) => (s === "completed" ? "✓" : s === "in_progress" ? "◐" : "○");
  const iconColor = (s: Step["status"]) =>
    s === "completed" ? "text-green-600" : s === "in_progress" ? "text-brand-500" : "text-ink-muted/40";

  return (
    <div className="rounded-[14px] border border-border-default bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">Setup Progress</h3>
        <span className="text-base font-extrabold text-brand-500">{data.percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-warm-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${data.percent}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {data.steps.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => router.push(s.href)}
              className="flex w-full items-center gap-2 text-left text-sm text-ink hover:text-brand-600 cursor-pointer"
            >
              <span className={`font-bold ${iconColor(s.status)}`}>{icon(s.status)}</span>
              <span className={s.status === "completed" ? "line-through opacity-50" : ""}>{s.title}</span>
              {!s.required && <span className="ml-1 text-[10px] text-ink-muted">(optional)</span>}
            </button>
          </li>
        ))}
      </ul>
      {data.nextStepHref && (
        <button
          onClick={() => router.push(data.nextStepHref!)}
          className="mt-4 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 cursor-pointer"
        >
          Continue Setup →
        </button>
      )}
    </div>
  );
}
