"use client";

import { formatCurrency } from "@/lib/utils";
import { MOCK_FLATS, MOCK_USERS, MOCK_SOCIETIES } from "@/lib/mockData";

export default function TenantProfile() {
  const tenant = MOCK_USERS.find((u) => u.id === "U5")!;
  const flat = MOCK_FLATS.find((f) => f.id === "F1")!;
  const society = MOCK_SOCIETIES.find((s) => s.id === flat.societyId)!;
  const landlord = MOCK_USERS.find((u) => u.id === flat.ownerId)!;

  const profileDetails = [
    { label: "Phone", value: tenant.phone },
    { label: "Email", value: tenant.email },
    { label: "Flat", value: flat.flatNo },
    { label: "Type", value: flat.type },
    { label: "Area", value: `${flat.area} sq.ft` },
    { label: "Floor", value: `${flat.floor}th Floor` },
    { label: "Landlord", value: landlord.name },
    { label: "Society", value: society.name },
    { label: "Lease End", value: "15 Aug 2026" },
    { label: "Security Deposit", value: formatCurrency(flat.deposit) },
    { label: "Monthly Rent", value: formatCurrency(flat.rent) },
    { label: "Payment Mode", value: "UPI Preferred" },
  ];

  return (
    <div>
      <h2 className="text-[15px] font-extrabold text-ink mb-4">👤 My Profile</h2>

      {/* Avatar card */}
      <div className="bg-white rounded-[14px] p-6 border border-border-default mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-extrabold text-brand-500 mx-auto mb-3">
          RS
        </div>
        <div className="text-lg font-extrabold text-ink">{tenant.name}</div>
        <div className="text-xs text-brand-500 font-semibold mt-0.5">Tenant</div>
        <div className="text-xs text-ink-muted mt-0.5">{tenant.email}</div>
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-[14px] p-4 border border-border-default mb-4">
        <div className="text-sm font-extrabold text-ink mb-3">Tenancy Details</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {profileDetails.map((d) => (
            <div key={d.label}>
              <div className="text-[9px] text-ink-muted uppercase tracking-wide">{d.label}</div>
              <div className="text-sm font-semibold text-ink mt-0.5">{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-2.5 rounded-xl border border-brand-500 text-brand-500 text-xs font-bold cursor-pointer">
          Edit Profile
        </button>
        <button className="flex-1 py-2.5 rounded-xl border border-border-default text-ink-muted text-xs font-bold cursor-pointer">
          Change Password
        </button>
      </div>
    </div>
  );
}
