import { Badge } from "@repo/design-system/components/ui/badge";
import { MapPinIcon, BriefcaseIcon } from "lucide-react";

interface PersonSummaryCardProps {
  employmentType: string;
  isActive: boolean;
  team: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

export function PersonSummaryCard({
  employmentType,
  isActive,
  team,
  location,
}: PersonSummaryCardProps) {
  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Profile
          </p>
          {!isActive && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive">
              Inactive
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Employment Type */}
          <div className="flex items-center gap-3">
            <BriefcaseIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Employment
              </p>
              <p className="text-sm font-medium">{employmentType || "Not specified"}</p>
            </div>
          </div>

          {/* Team */}
          {team && (
            <div className="flex items-center gap-3">
              <BriefcaseIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Team
                </p>
                <p className="text-sm font-medium">{team.name}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-center gap-3">
              <MapPinIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Location
                </p>
                <p className="text-sm font-medium">{location.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
