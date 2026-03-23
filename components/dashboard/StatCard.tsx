interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "text-brand-500",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-[14px] p-4 border border-border-default flex-1 min-w-[150px]">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-extrabold text-ink">{value}</div>
      <div className="text-[11px] text-ink-muted font-semibold mt-0.5">
        {label}
      </div>
      {sub && (
        <div className={`text-[11px] font-bold mt-0.5 ${accent}`}>{sub}</div>
      )}
    </div>
  );
}
