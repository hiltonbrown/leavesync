import { Badge } from "@repo/design-system/components/ui/badge";

interface PersonHeaderProps {
  firstName: string;
  lastName: string;
  email: string;
  sourceSystem: string;
}

export function PersonHeader({
  firstName,
  lastName,
  email,
  sourceSystem,
}: PersonHeaderProps) {
  const isXeroSource = sourceSystem?.toLowerCase() === "xero";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName} {lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>
      {sourceSystem && (
        <Badge variant={isXeroSource ? "default" : "outline"}>
          {isXeroSource ? "Xero" : "Manual"}
        </Badge>
      )}
    </div>
  );
}
