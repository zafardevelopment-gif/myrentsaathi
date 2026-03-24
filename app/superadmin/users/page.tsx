"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import toast from "react-hot-toast";
import { getAllUsers, updateUserStatus, type User } from "@/lib/superadmin-data";

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

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);

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
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider border-b border-border-default bg-warm-50">
          <span>User</span>
          <span>Contact</span>
          <span>Role</span>
          <span>Joined</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">
            {users.length === 0 ? "No users in database. Seed the DB first." : "No users match your filter."}
          </div>
        ) : (
          filtered.map((u) => (
            <div key={u.id}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center border-b border-border-light last:border-0 hover:bg-warm-50 transition-colors">
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
                <span className="text-[11px] text-ink-muted">
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold self-start ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {u.is_active ? "active" : "inactive"}
                </span>
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
              </div>

              {/* Mobile row */}
              <div className="md:hidden p-3 border-b border-border-light last:border-0 flex items-start gap-3">
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
                </div>
                <button
                  onClick={() => handleToggleStatus(u)}
                  disabled={saving === u.id}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer transition-colors disabled:opacity-50 flex-shrink-0 ${
                    u.is_active ? "border-red-200 text-red-500" : "border-green-200 text-green-600"
                  }`}
                >
                  {saving === u.id ? "…" : u.is_active ? "Off" : "On"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
