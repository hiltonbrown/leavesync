"use client";

import { DATE_RANGE_PRESET_OPTIONS } from "@repo/availability/src/analytics/date-range-options";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface AnalyticsFiltersProps {
  customEnd?: string;
  customStart?: string;
  preset: string;
}

export function AnalyticsFilters({
  customEnd,
  customStart,
  preset,
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localPreset, setLocalPreset] = useState(preset);
  const [localStart, setLocalStart] = useState(customStart ?? "");
  const [localEnd, setLocalEnd] = useState(customEnd ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", localPreset);
    if (localPreset === "custom") {
      if (localStart) {
        params.set("from", localStart);
      } else {
        params.delete("from");
      }
      if (localEnd) {
        params.set("to", localEnd);
      } else {
        params.delete("to");
      }
    } else {
      params.delete("from");
      params.delete("to");
    }
    params.delete("cursor");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-muted p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-widest">
          Period
        </Label>
        <Select onValueChange={setLocalPreset} value={localPreset}>
          <SelectTrigger className="min-w-48 rounded-xl bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {localPreset === "custom" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">From</Label>
            <Input
              className="rounded-xl bg-background"
              onChange={(e) => setLocalStart(e.target.value)}
              type="date"
              value={localStart}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">To</Label>
            <Input
              className="rounded-xl bg-background"
              onChange={(e) => setLocalEnd(e.target.value)}
              type="date"
              value={localEnd}
            />
          </div>
        </>
      ) : null}
      <Button onClick={apply} size="sm" type="button" variant="secondary">
        Apply
      </Button>
    </div>
  );
}
