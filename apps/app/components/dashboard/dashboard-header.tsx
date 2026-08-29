import { Badge } from "@repo/design-system/components/ui/badge";

interface DashboardHeaderProps {
  name: string;
  roleLabel: string;
  subtitle?: string;
}

export function DashboardHeader({
  name,
  roleLabel,
  subtitle,
}: DashboardHeaderProps) {
  return (
    <section className="-mx-4 bg-surface-container-low px-4 py-6 sm:-mx-6 sm:px-6">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-balance font-semibold text-headline-md leading-tight tracking-tight">
            {name}
          </h2>
          <Badge variant="outline">{roleLabel}</Badge>
        </div>
        {subtitle ? (
          <p className="text-body-md text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
