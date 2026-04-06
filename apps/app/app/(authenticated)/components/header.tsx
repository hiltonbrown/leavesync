import { OrganizationSwitcher } from "@repo/auth/client";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Separator } from "@repo/design-system/components/ui/separator";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { type ReactNode, Suspense } from "react";

interface HeaderProps {
  children?: ReactNode;
  page: string;
  pages?: string[];
}

export const Header = ({ page, children }: HeaderProps) => (
  <header
    className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 px-4"
    style={{
      background: "color-mix(in srgb, var(--sidebar) 85%, transparent)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--sidebar-border)",
    }}
  >
    <div className="flex items-center gap-3">
      <SidebarTrigger
        className="-ml-0.5 size-7"
        style={{ color: "var(--muted-foreground)" }}
      />
      <Separator className="h-4 opacity-40" orientation="vertical" />
      <h1 className="font-semibold text-[0.9375rem] tracking-[-0.01em]">
        {page}
      </h1>
    </div>

    <div className="flex items-center gap-2">
      {children}
      <ModeToggle />
      <Suspense
        fallback={
          <div className="h-7 w-32 animate-pulse rounded-md bg-[var(--sidebar-accent)]" />
        }
      >
        <OrganizationSwitcher afterSelectOrganizationUrl="/" hidePersonal />
      </Suspense>
    </div>
  </header>
);
