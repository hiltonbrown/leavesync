import { Badge } from "@repo/design-system/components/ui/badge";

interface DashboardHeaderProps {
  name: string;
  roleLabel: string;
  subtitle?: string;
  xeroConnected: boolean;
}

export function DashboardHeader({
  name,
  roleLabel,
  subtitle,
  xeroConnected,
}: DashboardHeaderProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-muted p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{roleLabel}</Badge>
        <Badge variant={xeroConnected ? "outline" : "secondary"}>
          {xeroConnected ? "Xero connected" : "Xero not connected"}
        </Badge>
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold text-2xl tracking-tight">{name}</h2>
        {subtitle ? (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
