import type { ReactNode } from "react";
import AdminHeader from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}
