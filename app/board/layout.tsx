import DashboardShell from "@/components/dashboard/DashboardShell";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="board">{children}</DashboardShell>;
}
