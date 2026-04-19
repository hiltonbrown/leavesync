"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { toast } from "@repo/design-system/components/ui/sonner";
import { useState, useTransition } from "react";
import { importFromSourceAction } from "../_actions";

const DEFAULT_COUNTRIES = [
  { countryCode: "AU", name: "Australia" },
  { countryCode: "NZ", name: "New Zealand" },
  { countryCode: "UK", name: "United Kingdom" },
] as const;

const ImportPublicHolidaysPage = () => {
  const [organisationId, setOrganisationId] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [regionCode, setRegionCode] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="font-semibold text-2xl">Import holidays</h1>
      <div className="space-y-2">
        <Label htmlFor="organisation-id">Organisation ID</Label>
        <Input
          id="organisation-id"
          onChange={(event) => setOrganisationId(event.target.value)}
          value={organisationId}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country-code">Country</Label>
        <select
          className="h-10 w-full rounded-xl bg-muted px-3"
          id="country-code"
          onChange={(event) => setCountryCode(event.target.value)}
          value={countryCode}
        >
          {DEFAULT_COUNTRIES.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="region-code">Region code</Label>
        <Input
          id="region-code"
          onChange={(event) => setRegionCode(event.target.value)}
          value={regionCode}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          onChange={(event) =>
            setYear(Number(event.target.value || new Date().getFullYear()))
          }
          type="number"
          value={year}
        />
      </div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await importFromSourceAction({
              countryCode,
              organisationId,
              regionCode: regionCode || null,
              year,
            });

            toast[result.ok ? "success" : "error"](
              result.ok ? "Holidays imported." : result.error
            );
          })
        }
      >
        Import
      </Button>
    </div>
  );
};

export default ImportPublicHolidaysPage;
