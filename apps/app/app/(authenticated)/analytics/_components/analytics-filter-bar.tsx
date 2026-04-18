import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type {
  LeaveReportsFilterInput,
  OutOfOfficeFilterInput,
} from "../_schemas";

interface FilterOption {
  id: string;
  name: string;
}

interface AnalyticsFilterBarProps {
  canIncludeArchived: boolean;
  filters: LeaveReportsFilterInput | OutOfOfficeFilterInput;
  filterType: "leave" | "ooo";
  locations: FilterOption[];
  orgQueryValue: string | null;
  recordTypes: readonly string[];
  teams: FilterOption[];
}

const presetLabels: Record<string, string> = {
  custom: "Custom",
  last_12_months: "Last 12 months",
  last_month: "Last month",
  last_quarter: "Last quarter",
  last_year: "Last year",
  this_month: "This month",
  this_quarter: "This quarter",
  this_year: "This year",
};

export function AnalyticsFilterBar({
  canIncludeArchived,
  filterType,
  filters,
  locations,
  orgQueryValue,
  recordTypes,
  teams,
}: AnalyticsFilterBarProps) {
  const recordTypeName = filterType === "leave" ? "leaveType" : "recordType";
  const selectedRecordType =
    "leaveType" in filters
      ? (filters.leaveType?.[0] ?? "all")
      : (filters.recordType?.[0] ?? "all");
  const includePublicHolidays =
    "includePublicHolidays" in filters ? filters.includePublicHolidays : false;
  return (
    <form className="grid gap-4 rounded-2xl bg-muted p-5 lg:grid-cols-6">
      {orgQueryValue && (
        <input name="org" type="hidden" value={orgQueryValue} />
      )}
      <FilterField label="Date range">
        <Select defaultValue={filters.preset} name="preset">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(presetLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Custom start">
        <Input
          defaultValue={filters.customStart ?? ""}
          name="customStart"
          type="date"
        />
      </FilterField>
      <FilterField label="Custom end">
        <Input
          defaultValue={filters.customEnd ?? ""}
          name="customEnd"
          type="date"
        />
      </FilterField>
      <FilterField label="Team">
        <Select defaultValue={filters.teamId?.[0] ?? "all"} name="teamId">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Location">
        <Select
          defaultValue={filters.locationId?.[0] ?? "all"}
          name="locationId"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Person type">
        <Select defaultValue={filters.personType} name="personType">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="employee">Employees</SelectItem>
            <SelectItem value="contractor">Contractors</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField className="lg:col-span-2" label="Type">
        <Select defaultValue={selectedRecordType} name={recordTypeName}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {recordTypes.map((recordType) => (
              <SelectItem key={recordType} value={recordType}>
                {labelForRecordType(recordType)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      {filterType === "leave" && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            defaultChecked={includePublicHolidays}
            name="includePublicHolidays"
            type="checkbox"
            value="true"
          />
          Exclude public holidays
        </label>
      )}
      {canIncludeArchived && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            defaultChecked={filters.includeArchivedPeople}
            name="includeArchivedPeople"
            type="checkbox"
            value="true"
          />
          Include archived people
        </label>
      )}
      <div className="flex items-end gap-3 lg:col-span-2">
        <Button type="submit">Apply filters</Button>
        <Button asChild variant="ghost">
          <a
            href={
              filterType === "leave"
                ? "/analytics/leave-reports"
                : "/analytics/out-of-office"
            }
          >
            Clear filters
          </a>
        </Button>
      </div>
    </form>
  );
}

function FilterField({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function labelForRecordType(recordType: string): string {
  return recordType
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
