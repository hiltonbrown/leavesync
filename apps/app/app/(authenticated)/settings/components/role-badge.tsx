import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";

type OrgRole = "org:owner" | "org:admin" | "org:manager" | "org:viewer";

const ROLE_CONFIG: Record<OrgRole, { label: string; className: string }> = {
  "org:owner": {
    label: "Owner",
    className:
      "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
  },
  "org:admin": {
    label: "Admin",
    className:
      "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/10",
  },
  "org:manager": {
    label: "Manager",
    className: "bg-muted text-foreground border-border hover:bg-muted",
  },
  "org:viewer": {
    label: "Viewer",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
  },
};

interface RoleBadgeProps {
  role: string;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const config = ROLE_CONFIG[role as OrgRole] ?? {
    label: role,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge className={cn("font-medium", config.className)} variant="outline">
      {config.label}
    </Badge>
  );
};
