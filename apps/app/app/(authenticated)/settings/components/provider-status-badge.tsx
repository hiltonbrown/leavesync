import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { CircleCheckIcon, CircleIcon, TriangleAlertIcon } from "lucide-react";

type ConnectionStatus = "connected" | "disconnected" | "error";

interface ProviderStatusBadgeProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    className: string;
  }
> = {
  connected: {
    label: "Connected",
    icon: CircleCheckIcon,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  disconnected: {
    label: "Not connected",
    icon: CircleIcon,
    className: "bg-muted text-muted-foreground border-border",
  },
  error: {
    label: "Error",
    icon: TriangleAlertIcon,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export const ProviderStatusBadge = ({ status }: ProviderStatusBadgeProps) => {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];

  return (
    <Badge className={cn("gap-1.5 font-medium", className)} variant="outline">
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </Badge>
  );
};
