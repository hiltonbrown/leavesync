"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { CalendarCheckIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import type { AvailableCountry } from "@/app/actions/holidays/get-countries";
import { SettingsComingSoon } from "../components/settings-coming-soon";
import { SettingsSectionHeader } from "../components/settings-section-header";

interface EnabledJurisdiction {
  countryCode: string;
  countryName: string;
}

interface HolidaysClientProps {
  countries: AvailableCountry[];
  enabledJurisdictions: EnabledJurisdiction[];
}

export const HolidaysClient = ({
  countries,
  enabledJurisdictions: initialJurisdictions,
}: HolidaysClientProps) => {
  const jurisdictions = initialJurisdictions;
  const [selectedCountry, setSelectedCountry] = useState("");

  const enabledCodes = new Set(jurisdictions.map((j) => j.countryCode));

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Select the public holiday jurisdictions that apply to your organisation's calendar feeds."
        title="Public Holidays"
      />

      {/* Add jurisdiction */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Add jurisdiction</CardTitle>
          <CardDescription>
            Public holiday jurisdiction storage is not enabled for this
            organisation yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select onValueChange={setSelectedCountry} value={selectedCountry}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select a country…" />
              </SelectTrigger>
              <SelectContent>
                {countries
                  .filter((c) => !enabledCodes.has(c.countryCode))
                  .map((c) => (
                    <SelectItem key={c.countryCode} value={c.countryCode}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button className="shrink-0 gap-2" disabled>
              <PlusIcon className="h-4 w-4" strokeWidth={2} />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enabled jurisdictions */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            Enabled jurisdictions
            {jurisdictions.length > 0 && (
              <span className="ml-2 font-normal text-muted-foreground text-sm">
                {jurisdictions.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jurisdictions.length === 0 ? (
            <div className="px-6 pb-6">
              <Empty className="border-0 bg-transparent py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarCheckIcon strokeWidth={1.75} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">
                    No jurisdictions added
                  </EmptyTitle>
                  <EmptyDescription>
                    Add at least one jurisdiction to include public holidays in
                    your calendar feeds.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {jurisdictions.map((j) => (
                <li
                  className="flex items-center justify-between px-6 py-4"
                  key={j.countryCode}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 font-bold text-primary text-xs">
                      {j.countryCode}
                    </span>
                    <span className="font-medium text-sm">{j.countryName}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SettingsComingSoon feature="Custom holiday overrides" />
    </div>
  );
};
