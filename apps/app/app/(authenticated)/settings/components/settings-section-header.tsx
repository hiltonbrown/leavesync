import type { ReactNode } from "react";

interface SettingsSectionHeaderProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export const SettingsSectionHeader = ({
  title,
  description,
  action,
}: SettingsSectionHeaderProps) => (
  <div className="flex items-start justify-between gap-4 pb-6">
    <div className="space-y-1">
      <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
        Configuration
      </p>
      <h2 className="font-semibold text-[1.375rem] tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    {action && <div className="shrink-0 pt-1">{action}</div>}
  </div>
);
