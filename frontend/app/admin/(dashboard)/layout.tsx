import AdminShell from "@/components/admin/Shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
