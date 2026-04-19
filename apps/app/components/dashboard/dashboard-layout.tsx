import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}
