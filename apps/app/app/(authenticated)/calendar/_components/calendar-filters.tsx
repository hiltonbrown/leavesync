"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Button } from "@repo/design-system/components/ui/button";
import { XIcon } from "lucide-react";

interface CalendarFiltersProps {
  team?: string;
  location?: string;
  recordType?: string;
  approvalStatus?: string;
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

export function CalendarFilters({
  team,
  location,
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

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("team");
    params.delete("location");
    params.delete("recordType");
    params.delete("approvalStatus");

    router.push(`?${params.toString()}`);
  };

  const hasFilters =
    team || location || recordType || approvalStatus;

  return (
    <div className="flex flex-wrap gap-3 items-center mb-6">
      <Select value={recordType || ""} onValueChange={(value) => updateFilter("recordType", value || null)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Record type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All types</SelectItem>
          {RECORD_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={approvalStatus || ""} onValueChange={(value) => updateFilter("approvalStatus", value || null)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {APPROVAL_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-2"
        >
          <XIcon className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
