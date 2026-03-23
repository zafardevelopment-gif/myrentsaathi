import { getStatusColors, formatStatus } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = getStatusColors(status);
  return (
    <span
      className={`inline-block px-2.5 py-[3px] rounded-2xl text-[10px] font-bold tracking-wider ${colors.text} ${colors.bg}`}
    >
      {label || formatStatus(status)}
    </span>
  );
}
