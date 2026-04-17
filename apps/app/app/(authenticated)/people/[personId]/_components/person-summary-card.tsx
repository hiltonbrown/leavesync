import { Badge } from "@repo/design-system/components/ui/badge";
import { BriefcaseIcon, MapPinIcon } from "lucide-react";

interface PersonSummaryCardProps {
  employmentType: string;
  isActive: boolean;
  location: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
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
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
            Profile
          </p>
          {!isActive && (
            <Badge
              className="bg-destructive/10 text-destructive"
              variant="outline"
            >
              Inactive
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Employment Type */}
          <div className="flex items-center gap-3">
            <BriefcaseIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">
                Employment
              </p>
              <p className="font-medium text-sm">
                {employmentType || "Not specified"}
              </p>
            </div>
          </div>

          {/* Team */}
          {team && (
            <div className="flex items-center gap-3">
              <BriefcaseIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-widest">
                  Team
                </p>
                <p className="font-medium text-sm">{team.name}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-center gap-3">
              <MapPinIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-widest">
                  Location
                </p>
                <p className="font-medium text-sm">{location.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
