"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { supabase } from "@/lib/supabase";

type DueInvoice = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  due_date: string | null;
  total_amount: number;
  late_fee_total: number;
  amount_paid: number;
  status: string;
  recipient_user_id: string | null;
  flat: { flat_number: string; block: string | null } | null;
};

type Row = DueInvoice & { tenantName: string; tenantPhone: string | null; daysOverdue: number };

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date(new Date().toDateString());
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

/**
 * "Who owes rent, and since when" — every unpaid/partially-paid/overdue
 * invoice for this landlord/society, oldest-due first, with a running total.
 * Pulls from the same `invoices` table the billing dashboard and the
 * reminder cron already use, so this always matches what reminders go out for.
 */
export default function RentDueReport() {
  const { user, hydrated } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      const due: DueInvoice[] = (data.invoices ?? []).filter((i: DueInvoice) =>
        ["unpaid", "partially_paid", "overdue"].includes(i.status)
      );

      const userIds = [...new Set(due.map((i) => i.recipient_user_id).filter(Boolean))] as string[];
      let userMap = new Map<string, { full_name: string; phone: string | null }>();
      if (userIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, phone").in("id", userIds);
        userMap = new Map((users ?? []).map((u) => [u.id, { full_name: u.full_name, phone: u.phone }]));
      }

      const enriched: Row[] = due
        .map((i) => ({
          ...i,
          tenantName: (i.recipient_user_id && userMap.get(i.recipient_user_id)?.full_name) || "Tenant",
          tenantPhone: (i.recipient_user_id && userMap.get(i.recipient_user_id)?.phone) || null,
          daysOverdue: daysOverdue(i.due_date),
        }))
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (hydrated && user) load(); }, [hydrated, user, load]);

  const totalDue = rows.reduce((sum, r) => sum + (Number(r.total_amount) + Number(r.late_fee_total) - Number(r.amount_paid)), 0);
  const overdueCount = rows.filter((r) => r.daysOverdue > 0).length;

  return (
    <div className="rounded-[14px] border border-border-default bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-ink">Rent Due Report</h3>
        {!loading && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-ink-muted">{rows.length} pending · {overdueCount} overdue</span>
            <span className="font-extrabold text-ink">{inr(totalDue)} outstanding</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-4 text-sm text-ink-muted">Nothing due — every invoice is paid up. 🎉</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-border-default">
                <th className="pb-2 pr-3">Tenant</th>
                <th className="pb-2 pr-3">Flat</th>
                <th className="pb-2 pr-3">Due date</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3 text-right">Late fee</th>
                <th className="pb-2 pr-3 text-right">Amount due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-default/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">{r.tenantName}</td>
                  <td className="py-2 pr-3 text-ink-muted">{r.flat ? `${r.flat.flat_number}${r.flat.block ? ` (${r.flat.block})` : ""}` : "—"}</td>
                  <td className="py-2 pr-3 text-ink-muted">{r.due_date ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {r.daysOverdue > 0 ? (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">{r.daysOverdue}d overdue</span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-bold">Upcoming</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right text-ink-muted">{Number(r.late_fee_total) > 0 ? inr(r.late_fee_total) : "—"}</td>
                  <td className="py-2 pr-3 text-right font-bold text-ink">{inr(Number(r.total_amount) + Number(r.late_fee_total) - Number(r.amount_paid))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
