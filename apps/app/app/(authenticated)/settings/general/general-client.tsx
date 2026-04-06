"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useState, useTransition } from "react";
import { toast } from "@repo/design-system/components/ui/sonner";
import { updateOrg } from "@/app/actions/settings/update-org";
import { SettingsComingSoon } from "../components/settings-coming-soon";
import { SettingsSectionHeader } from "../components/settings-section-header";

// Common IANA timezones
const TIMEZONES = [
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — NZST/NZDT" },
  { value: "Australia/Sydney", label: "Australia/Sydney — AEST/AEDT" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne — AEST/AEDT" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane — AEST" },
  { value: "Australia/Perth", label: "Australia/Perth — AWST" },
  { value: "Asia/Singapore", label: "Asia/Singapore — SGT" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong — HKT" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo — JST" },
  { value: "Europe/London", label: "Europe/London — GMT/BST" },
  { value: "Europe/Paris", label: "Europe/Paris — CET/CEST" },
  { value: "Europe/Berlin", label: "Europe/Berlin — CET/CEST" },
  { value: "America/New_York", label: "America/New_York — EST/EDT" },
  { value: "America/Chicago", label: "America/Chicago — CST/CDT" },
  { value: "America/Denver", label: "America/Denver — MST/MDT" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles — PST/PDT" },
];

const LOCALES = [
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-SG", label: "English (Singapore)" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface GeneralClientProps {
  fiscalYearStart: number;
  locale: string;
  orgName: string;
  timezone: string;
}

export const GeneralClient = ({
  orgName,
  timezone,
  locale,
  fiscalYearStart,
}: GeneralClientProps) => {
  const [name, setName] = useState(orgName);
  const [tz, setTz] = useState(timezone);
  const [loc, setLoc] = useState(locale);
  const [fiscal, setFiscal] = useState(fiscalYearStart);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    name !== orgName ||
    tz !== timezone ||
    loc !== locale ||
    fiscal !== fiscalYearStart;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateOrg({
        name,
        timezone: tz,
        locale: loc,
        fiscalYearStart: fiscal,
      });

      if (result.ok) {
        toast.success("Organisation settings saved");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Manage your organisation's name, locale, and calendar settings."
        title="General"
      />

      <Card className="rounded-2xl bg-muted/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Organisation details</CardTitle>
          <CardDescription>
            These settings apply to all members of your organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organisation name</Label>
            <Input
              className="max-w-sm"
              id="org-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Ltd"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select onValueChange={setTz} value={tz}>
              <SelectTrigger className="max-w-sm" id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Used for calendar feeds, sync schedules, and date display.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Select onValueChange={setLoc} value={loc}>
              <SelectTrigger className="max-w-sm" id="locale">
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Controls date, number, and currency formatting.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal-year">Fiscal year starts</Label>
            <Select
              onValueChange={(v) => setFiscal(Number(v))}
              value={String(fiscal)}
            >
              <SelectTrigger className="max-w-[200px]" id="fiscal-year">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Used for leave balance reporting and accrual calculations.
            </p>
          </div>
        </CardContent>
      </Card>

      <SettingsComingSoon feature="Organisation logo" />

      <div className="flex justify-end">
        <Button
          className="min-w-24"
          disabled={!isDirty || isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
};
