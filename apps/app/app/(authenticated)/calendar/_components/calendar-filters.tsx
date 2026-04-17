"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { preserveOrgQueryParam } from "@/lib/navigation/org-url";

interface CalendarFiltersProps {
  approvalStatus?: string;
  location?: string;
  orgQueryValue?: null | string;
  recordType?: string;
  team?: string;
}

const RECORD_TYPE_OPTIONS = [
  { value: "leave", label: "Leave" },
  { value: "wfh", label: "Work from Home" },
  { value: "training", label: "Training" },
  { value: "travel", label: "Travel" },
  { value: "client-site", label: "Client Site" },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "submitted", label: "Pending" },
  { value: "declined", label: "Declined" },
  { value: "draft", label: "Draft" },
];

const ALL_RECORD_TYPES_VALUE = "__all_record_types__";
const ALL_APPROVAL_STATUSES_VALUE = "__all_approval_statuses__";

export function CalendarFilters({
  team,
  location,
  orgQueryValue,
  recordType,
  approvalStatus,
}: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    preserveOrgQueryParam(params, orgQueryValue);

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("team");
    params.delete("location");
    params.delete("recordType");
    params.delete("approvalStatus");
    preserveOrgQueryParam(params, orgQueryValue);

    router.push(`?${params.toString()}`);
  };

  const hasFilters = team || location || recordType || approvalStatus;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Select
        onValueChange={(value) =>
          updateFilter(
            "recordType",
            value === ALL_RECORD_TYPES_VALUE ? null : value
          )
        }
        value={recordType || ALL_RECORD_TYPES_VALUE}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Record type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_RECORD_TYPES_VALUE}>All types</SelectItem>
          {RECORD_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) =>
          updateFilter(
            "approvalStatus",
            value === ALL_APPROVAL_STATUSES_VALUE ? null : value
          )
        }
        value={approvalStatus || ALL_APPROVAL_STATUSES_VALUE}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_APPROVAL_STATUSES_VALUE}>
            All statuses
          </SelectItem>
          {APPROVAL_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          className="gap-2"
          onClick={clearFilters}
          size="sm"
          variant="ghost"
        >
          <XIcon className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
