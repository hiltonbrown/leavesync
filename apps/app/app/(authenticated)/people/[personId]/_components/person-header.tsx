import { Badge } from "@repo/design-system/components/ui/badge";

interface PersonHeaderProps {
  email: string;
  firstName: string;
  lastName: string;
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
    <div className="flex items-center justify-between gap-4 border-border border-b px-6 py-4">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          {firstName} {lastName}
        </h1>
        <p className="text-muted-foreground text-sm">{email}</p>
      </div>
      {sourceSystem && (
        <Badge variant={isXeroSource ? "default" : "outline"}>
          {isXeroSource ? "Xero" : "Manual"}
        </Badge>
      )}
    </div>
  );
}
