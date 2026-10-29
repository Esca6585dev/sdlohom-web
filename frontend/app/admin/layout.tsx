import type { Metadata } from "next";
import { AdminAuthProvider } from "@/components/admin/AuthProvider";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata: Metadata = {
  title: { default: "Admin panel", template: "%s · SDLOHOM admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </ToastProvider>
  );
}
