"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";

type Step = { key: string; title: string; status: "not_started" | "in_progress" | "completed"; required: boolean; href: string; hint?: string };
type Progress = { percent: number; completed: boolean; nextStepHref: string | null; steps: Step[] };

/** Dashboard Setup Progress card (§33A). Drop into /admin or /landlord dashboards. */
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
  const color = (s: Step["status"]) => (s === "completed" ? "#16a34a" : s === "in_progress" ? "#f59e0b" : "#cbd5e1");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Setup Progress</h3>
        <span className="text-lg font-extrabold text-indigo-700">{data.percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${data.percent}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {data.steps.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => router.push(s.href)}
              className="flex w-full items-center gap-2 text-left text-sm text-gray-700 hover:text-indigo-700"
            >
              <span style={{ color: color(s.status) }} className="font-bold">{icon(s.status)}</span>
              <span className={s.status === "completed" ? "line-through opacity-60" : ""}>{s.title}</span>
              {!s.required && <span className="ml-1 text-[10px] text-gray-400">(optional)</span>}
            </button>
          </li>
        ))}
      </ul>
      {data.nextStepHref && (
        <button
          onClick={() => router.push(data.nextStepHref!)}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Continue Setup →
        </button>
      )}
    </div>
  );
}
