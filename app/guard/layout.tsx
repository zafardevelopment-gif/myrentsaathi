import DashboardShell from "@/components/dashboard/DashboardShell";

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="guard">{children}</DashboardShell>;
}
