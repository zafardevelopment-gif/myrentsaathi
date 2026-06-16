"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast from "react-hot-toast";
import { getAllUsers, updateUserStatus, deleteUser, getUserDetail, type User, type UserDetail } from "@/lib/superadmin-data";

const PAGE_SIZE = 15;

const ROLE_BADGE: Record<string, string> = {
  society_admin: "bg-brand-100 text-brand-500",
  board_member:  "bg-purple-100 text-purple-700",
  landlord:      "bg-green-100 text-green-700",
  tenant:        "bg-blue-100 text-blue-700",
  superadmin:    "bg-amber-100 text-amber-700",
};

const ROLE_ICON: Record<string, string> = {
  society_admin: "🏢",
  board_member:  "⚖️",
  landlord:      "👤",
  tenant:        "🏠",
  superadmin:    "⭐",
};

const ROLE_LABEL: Record<string, string> = {
  society_admin: "Admin",
  board_member:  "Board",
  landlord:      "Landlord",
  tenant:        "Tenant",
  superadmin:    "SuperAdmin",
};

const PLAN_BADGE: Record<string, string> = {
  trial:     "bg-yellow-100 text-yellow-700",
  active:    "bg-green-100 text-green-700",
  expired:   "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function PlanBadge({ sub }: { sub: User["subscription"] }) {
  if (!sub) return <span className="text-[9px] text-ink-muted">No plan</span>;
  const badge = PLAN_BADGE[sub.status] ?? "bg-gray-100 text-gray-500";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge}`}>
        {sub.plan_name}
      </span>
      <span className="text-[8px] text-ink-muted capitalize">{sub.status}</span>
    </div>
  );
}

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserDetail(userId).then((d) => { setDetail(d); setLoading(false); });
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[18px] bg-white overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-warm-50">
          <span className="text-[13px] font-extrabold text-ink">User Details</span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-lg cursor-pointer leading-none">✕</button>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-warm-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !detail ? (
          <div className="p-6 text-center text-ink-muted text-sm">User not found.</div>
        ) : (
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Identity */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center text-2xl flex-shrink-0">
                {ROLE_ICON[detail.role] ?? "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold text-ink">{detail.full_name}</div>
                <div className="text-[11px] text-ink-muted">{detail.email}</div>
                <div className="text-[11px] text-ink-muted">{detail.phone}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ROLE_BADGE[detail.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_ICON[detail.role]} {ROLE_LABEL[detail.role] ?? detail.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${detail.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {detail.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscription Plan */}
            <div className="bg-warm-50 rounded-[12px] p-3.5 border border-border-default">
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Subscription Plan</div>
              {detail.subscription ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-ink-muted">Plan Name</div>
                    <div className="text-[12px] font-bold text-ink">{detail.subscription.plan_name}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-ink-muted">Plan Type</div>
                    <div className="text-[12px] font-semibold text-ink capitalize">{detail.subscription.plan_type}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-ink-muted">Status</div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${PLAN_BADGE[detail.subscription.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {detail.subscription.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9px] text-ink-muted">Price</div>
                    <div className="text-[12px] font-bold text-ink">
                      {detail.subscription.plan_price === 0 ? "Free" : `₹${detail.subscription.plan_price}/mo`}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[9px] text-ink-muted">Expires At</div>
                    <div className="text-[11px] font-semibold text-ink">
                      {new Date(detail.subscription.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-ink-muted">No subscription found</div>
              )}
            </div>

            {/* Activity Stats */}
            <div>
              <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Activity</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-warm-50 rounded-xl p-2.5 text-center border border-border-default">
                  <div className="text-[18px] font-extrabold text-ink">{detail.flats_count}</div>
                  <div className="text-[9px] text-ink-muted">Flats</div>
                </div>
                <div className="bg-warm-50 rounded-xl p-2.5 text-center border border-border-default">
                  <div className="text-[18px] font-extrabold text-ink">{detail.tenants_count}</div>
                  <div className="text-[9px] text-ink-muted">Tenants</div>
                </div>
                <div className="bg-warm-50 rounded-xl p-2.5 text-center border border-border-default">
                  <div className="text-[18px] font-extrabold text-ink">{detail.payments_count}</div>
                  <div className="text-[9px] text-ink-muted">Payments</div>
                </div>
              </div>
            </div>

            {/* Societies */}
            {detail.societies.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Societies</div>
                <div className="space-y-1.5">
                  {detail.societies.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 bg-warm-50 rounded-xl px-3 py-2 border border-border-default">
                      <span className="text-[14px]">🏢</span>
                      <div>
                        <div className="text-[11px] font-semibold text-ink">{s.name}</div>
                        <div className="text-[9px] text-ink-muted">{s.city}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-ink-muted pt-1 border-t border-border-light">
              <div>
                <span className="font-semibold">Joined: </span>
                {new Date(detail.created_at).toLocaleDateString("en-IN")}
              </div>
              <div>
                <span className="font-semibold">Last Login: </span>
                {detail.last_login ? new Date(detail.last_login).toLocaleDateString("en-IN") : "Never"}
              </div>
              <div className="col-span-2 truncate">
                <span className="font-semibold">ID: </span>
                <span className="font-mono">{detail.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggleStatus(user: User) {
    const action = user.is_active ? "deactivate" : "activate";
    if (!confirm(`${action} ${user.full_name}?`)) return;
    setSaving(user.id);
    try {
      await updateUserStatus(user.id, !user.is_active);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast.success(`User ${action}d`);
    } catch {
      toast.error("Failed — check RLS policies");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    setDeleting(confirmDel.id);
    try {
      await deleteUser(confirmDel.id);
      setUsers((prev) => prev.filter((u) => u.id !== confirmDel.id));
      toast.success(`${confirmDel.full_name} deleted`);
      setConfirmDel(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.is_active) ||
      (filterStatus === "inactive" && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paged = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filterRole, filterStatus]);

  const counts: Record<string, number> = {};
  for (const u of users) {
    counts[u.role] = (counts[u.role] ?? 0) + 1;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-warm-100 rounded-[14px] animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[14px] p-6 text-center">
        <div className="text-red-600 font-bold mb-2">⚠️ {error}</div>
        <button onClick={load} className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-bold cursor-pointer">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-2.5 flex-wrap mb-4">
        <StatCard icon="👥" label="Total Users" value={String(users.length)} sub={`${users.filter(u=>u.is_active).length} active`} accent="text-green-600" />
        <StatCard icon="🏢" label="Society Admins" value={String(counts.society_admin ?? 0)} accent="text-brand-500" />
        <StatCard icon="👤" label="Landlords" value={String(counts.landlord ?? 0)} accent="text-green-600" />
        <StatCard icon="🏠" label="Tenants" value={String(counts.tenant ?? 0)} accent="text-blue-600" />
      </div>

      {/* Role filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "society_admin", "board_member", "landlord", "tenant"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
              filterRole === r
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-ink-muted border-border-default hover:bg-warm-50"
            }`}
          >
            {r === "all"
              ? `All (${users.length})`
              : `${ROLE_ICON[r]} ${ROLE_LABEL[r]} (${counts[r] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Search + Status filter */}
      <div className="bg-white rounded-[14px] p-3 border border-border-default mb-4 flex flex-wrap gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none focus:border-amber-400"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border-default text-[12px] text-ink bg-warm-50 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center text-[11px] text-ink-muted font-semibold self-center">
          {filtered.length} of {users.length}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-[14px] border border-border-default overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider border-b border-border-default bg-warm-50">
          <span>User</span>
          <span>Contact</span>
          <span>Role</span>
          <span>Plan</span>
          <span>Joined</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            {users.length === 0 ? "No users in database. Seed the DB first." : "No users match your filter."}
          </div>
        ) : (
          paged.map((u) => (
            <div key={u.id}>
              {/* Desktop row */}
              <div
                className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center border-b border-border-light last:border-0 hover:bg-warm-50 transition-colors cursor-pointer"
                onClick={() => setSelectedUserId(u.id)}
              >
                <div>
                  <div className="text-[12px] font-semibold text-ink">{u.full_name}</div>
                  <div className="text-[10px] text-ink-muted">{u.id.slice(0, 8)}…</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-soft">{u.email}</div>
                  <div className="text-[10px] text-ink-muted">{u.phone}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold self-start ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_ICON[u.role]} {ROLE_LABEL[u.role] ?? u.role}
                </span>
                <div className="self-start" onClick={(e) => e.stopPropagation()}>
                  <PlanBadge sub={u.subscription} />
                </div>
                <span className="text-[11px] text-ink-muted">
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold self-start ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {u.is_active ? "active" : "inactive"}
                </span>
                <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={saving === u.id}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
                      u.is_active
                        ? "border-red-200 text-red-500 hover:bg-red-50"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {saving === u.id ? "..." : u.is_active ? "Deactivate" : "Activate"}
                  </button>
                  {u.role !== "superadmin" && (
                    <button
                      onClick={() => setConfirmDel(u)}
                      className="px-2.5 py-1 rounded-lg border border-red-300 text-red-600 text-[10px] font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                      title="Permanently delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile row */}
              <div
                className="md:hidden p-3 border-b border-border-light last:border-0 flex items-start gap-3 cursor-pointer active:bg-warm-50"
                onClick={() => setSelectedUserId(u.id)}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] bg-warm-100 flex-shrink-0">
                  {ROLE_ICON[u.role] ?? "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-ink">{u.full_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ROLE_BADGE[u.role] ?? ""}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {u.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-muted mt-0.5">{u.email}</div>
                  <div className="text-[10px] text-ink-muted">{u.phone}</div>
                  {u.subscription && (
                    <div className="mt-1">
                      <PlanBadge sub={u.subscription} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={saving === u.id}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer transition-colors disabled:opacity-50 ${
                      u.is_active ? "border-red-200 text-red-500" : "border-green-200 text-green-600"
                    }`}
                  >
                    {saving === u.id ? "…" : u.is_active ? "Off" : "On"}
                  </button>
                  {u.role !== "superadmin" && (
                    <button
                      onClick={() => setConfirmDel(u)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-300 text-red-600 cursor-pointer"
                    >
                      Del
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border-default flex-wrap">
            <div className="text-[11px] text-ink-muted">
              Showing {(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageClamped === 1}
                className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50"
              >‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageClamped) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === "…"
                  ? <span key={`e${i}`} className="px-1 text-[11px] text-ink-muted">…</span>
                  : <button key={p} onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${p === pageClamped ? "bg-amber-500 text-white" : "border border-border-default text-ink-muted hover:bg-warm-50"}`}>{p}</button>
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageClamped === totalPages}
                className="px-2.5 py-1 rounded-lg border border-border-default text-[11px] font-semibold text-ink-muted disabled:opacity-40 cursor-pointer hover:bg-warm-50"
              >Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-[18px] bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-3">🗑️</div>
            <div className="text-base font-extrabold text-ink mb-1">Delete User?</div>
            <div className="text-sm text-ink-muted mb-1">
              <strong>{confirmDel.full_name}</strong> ({ROLE_LABEL[confirmDel.role] ?? confirmDel.role})
            </div>
            <div className="text-xs text-red-500 mb-4">
              Permanently deletes the user and all their data (flats, tenants, invoices, payments). Cannot be undone.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting === confirmDel.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
                {deleting === confirmDel.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
