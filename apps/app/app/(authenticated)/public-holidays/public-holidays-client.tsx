"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertCircleIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  GlobeIcon,
  MoonIcon,
  RssIcon,
  XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import type { AvailableCountry } from "@/app/actions/holidays/get-countries";
import {
  getPublicHolidays,
  type NagerHoliday,
} from "@/app/actions/holidays/get-holidays";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayClassification = "non-working" | "working";

interface MockFeed {
  description: string;
  id: string;
  name: string;
  personCount: number;
  status: "active" | "paused";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const MOCK_FEEDS: MockFeed[] = [
  {
    id: "feed_1",
    name: "Engineering Team",
    description: "All leave for the engineering department",
    status: "active",
    personCount: 3,
  },
  {
    id: "feed_2",
    name: "Product & Design",
    description: "Leave calendar for product and design",
    status: "active",
    personCount: 4,
  },
  {
    id: "feed_3",
    name: "All Staff",
    description: "Company-wide leave feed for all employees",
    status: "paused",
    personCount: 7,
  },
];

// Human-readable names for known ISO 3166-2 subdivision codes.
// For codes not in this map, the raw subdivision part (e.g. "BY") is used.
const SUBDIVISION_NAMES: Record<string, string> = {
  // Australia
  "AU-ACT": "Australian Capital Territory",
  "AU-NSW": "New South Wales",
  "AU-NT": "Northern Territory",
  "AU-QLD": "Queensland",
  "AU-SA": "South Australia",
  "AU-TAS": "Tasmania",
  "AU-VIC": "Victoria",
  "AU-WA": "Western Australia",
  // United Kingdom
  "GB-ENG": "England",
  "GB-NIR": "Northern Ireland",
  "GB-SCT": "Scotland",
  "GB-WLS": "Wales",
  // United States
  "US-AL": "Alabama",
  "US-AK": "Alaska",
  "US-AZ": "Arizona",
  "US-AR": "Arkansas",
  "US-CA": "California",
  "US-CO": "Colorado",
  "US-CT": "Connecticut",
  "US-DE": "Delaware",
  "US-FL": "Florida",
  "US-GA": "Georgia",
  "US-HI": "Hawaii",
  "US-ID": "Idaho",
  "US-IL": "Illinois",
  "US-IN": "Indiana",
  "US-IA": "Iowa",
  "US-KS": "Kansas",
  "US-KY": "Kentucky",
  "US-LA": "Louisiana",
  "US-ME": "Maine",
  "US-MD": "Maryland",
  "US-MA": "Massachusetts",
  "US-MI": "Michigan",
  "US-MN": "Minnesota",
  "US-MS": "Mississippi",
  "US-MO": "Missouri",
  "US-MT": "Montana",
  "US-NE": "Nebraska",
  "US-NV": "Nevada",
  "US-NH": "New Hampshire",
  "US-NJ": "New Jersey",
  "US-NM": "New Mexico",
  "US-NY": "New York",
  "US-NC": "North Carolina",
  "US-ND": "North Dakota",
  "US-OH": "Ohio",
  "US-OK": "Oklahoma",
  "US-OR": "Oregon",
  "US-PA": "Pennsylvania",
  "US-RI": "Rhode Island",
  "US-SC": "South Carolina",
  "US-SD": "South Dakota",
  "US-TN": "Tennessee",
  "US-TX": "Texas",
  "US-UT": "Utah",
  "US-VT": "Vermont",
  "US-VA": "Virginia",
  "US-WA": "Washington",
  "US-WV": "West Virginia",
  "US-WI": "Wisconsin",
  "US-WY": "Wyoming",
  "US-DC": "Washington D.C.",
  // Canada
  "CA-AB": "Alberta",
  "CA-BC": "British Columbia",
  "CA-MB": "Manitoba",
  "CA-NB": "New Brunswick",
  "CA-NL": "Newfoundland and Labrador",
  "CA-NS": "Nova Scotia",
  "CA-NT": "Northwest Territories",
  "CA-NU": "Nunavut",
  "CA-ON": "Ontario",
  "CA-PE": "Prince Edward Island",
  "CA-QC": "Quebec",
  "CA-SK": "Saskatchewan",
  "CA-YT": "Yukon",
  // New Zealand
  "NZ-AUK": "Auckland",
  "NZ-BOP": "Bay of Plenty",
  "NZ-CAN": "Canterbury",
  "NZ-HKB": "Hawke's Bay",
  "NZ-MBH": "Marlborough",
  "NZ-MWT": "Manawatu-Whanganui",
  "NZ-NSN": "Nelson",
  "NZ-NTL": "Northland",
  "NZ-OTA": "Otago",
  "NZ-STL": "Southland",
  "NZ-TAS": "Tasman",
  "NZ-TKI": "Taranaki",
  "NZ-WGN": "Wellington",
  "NZ-WKO": "Waikato",
  "NZ-WTC": "West Coast",
};

// ─── Type display config ──────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> =
  {
    Public: {
      label: "Public holiday",
      bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
      text: "var(--primary)",
    },
    Bank: {
      label: "Bank holiday",
      bg: "color-mix(in srgb, var(--primary) 8%, transparent)",
      text: "var(--primary)",
    },
    School: {
      label: "School",
      bg: "color-mix(in srgb, var(--tertiary, var(--primary)) 12%, transparent)",
      text: "var(--tertiary, var(--primary))",
    },
    Authorities: {
      label: "Authorities",
      bg: "var(--accent)",
      text: "var(--muted-foreground)",
    },
    Optional: {
      label: "Optional",
      bg: "var(--accent)",
      text: "var(--muted-foreground)",
    },
    Observance: {
      label: "Observance",
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
    },
  };

const FALLBACK_TYPE_CONFIG = {
  label: "Holiday",
  bg: "var(--muted)",
  text: "var(--muted-foreground)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 0x1_f1_a5))
    .join("");
}

function getSubdivisionName(code: string): string {
  return SUBDIVISION_NAMES[code] ?? code.split("-")[1];
}

function deriveRegions(
  holidays: NagerHoliday[]
): { code: string; name: string }[] {
  const codes = new Set<string>();
  for (const h of holidays) {
    for (const c of h.counties ?? []) {
      codes.add(c);
    }
  }
  return [...codes]
    .sort()
    .map((code) => ({ code, name: getSubdivisionName(code) }));
}

function filterByRegion(
  holidays: NagerHoliday[],
  regionCode: string | null
): NagerHoliday[] {
  if (!regionCode) {
    return holidays;
  }
  return holidays.filter(
    (h) => h.global || h.counties === null || h.counties.includes(regionCode)
  );
}

function holidayKey(h: NagerHoliday): string {
  return `${h.date}::${h.name}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(
  holidays: NagerHoliday[]
): { month: string; items: NagerHoliday[] }[] {
  const map = new Map<string, NagerHoliday[]>();
  for (const h of holidays) {
    const key = monthLabel(h.date);
    if (!map.has(key)) {
      map.set(key, []);
    }
    // biome-ignore lint/style/noNonNullAssertion: key was just set above
    map.get(key)!.push(h);
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
}

// ─── AddToFeedDialog ──────────────────────────────────────────────────────────

interface AddToFeedDialogProps {
  count: number;
  onClose: () => void;
  onConfirm: (feedId: string, classification: DayClassification) => void;
  open: boolean;
}

function AddToFeedDialog({
  open,
  onClose,
  count,
  onConfirm,
}: AddToFeedDialogProps) {
  const [feedId, setFeedId] = useState<string>("");
  const [classification, setClassification] =
    useState<DayClassification>("non-working");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setFeedId("");
      setClassification("non-working");
    }
  };

  const selectedFeed = MOCK_FEEDS.find((f) => f.id === feedId) ?? null;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to calendar feed</DialogTitle>
          <DialogDescription>
            Add {count} {count === 1 ? "holiday" : "holidays"} to a feed. They
            will appear as dated events in the published calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          {/* Feed selector */}
          <div className="flex flex-col gap-2">
            <Label className="font-medium text-[0.8125rem]">
              Calendar feed
            </Label>
            <Select onValueChange={setFeedId} value={feedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a feed…" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_FEEDS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <RssIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span>{f.name}</span>
                      {f.status === "paused" && (
                        <span className="font-semibold text-[0.625rem] text-muted-foreground uppercase tracking-wider">
                          Paused
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFeed && (
              <p className="text-[0.75rem] text-muted-foreground">
                {selectedFeed.description} · {selectedFeed.personCount}{" "}
                {selectedFeed.personCount === 1 ? "person" : "people"}
              </p>
            )}
          </div>

          {/* Classification */}
          <div className="flex flex-col gap-2">
            <Label className="font-medium text-[0.8125rem]">
              Day classification
            </Label>
            <p className="-mt-0.5 text-[0.75rem] text-muted-foreground">
              Controls how these holidays appear in the published calendar feed.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {(
                [
                  {
                    value: "non-working",
                    icon: MoonIcon,
                    title: "Non-working day",
                    description:
                      "Shown as unavailable; blocks time in the feed",
                  },
                  {
                    value: "working",
                    icon: BriefcaseIcon,
                    title: "Working day",
                    description:
                      "Informational only; time remains free in the feed",
                  },
                ] as const
              ).map(({ value, icon: Icon, title, description }) => {
                const active = classification === value;
                return (
                  <button
                    className="flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all"
                    key={value}
                    onClick={() => setClassification(value)}
                    style={
                      active
                        ? {
                            borderColor: "var(--primary)",
                            background:
                              "color-mix(in srgb, var(--primary) 6%, transparent)",
                          }
                        : {
                            borderColor: "var(--border)",
                            background: "transparent",
                          }
                    }
                    type="button"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        background: active
                          ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                          : "var(--muted)",
                      }}
                    >
                      <Icon
                        className="size-3.5"
                        strokeWidth={1.75}
                        style={{
                          color: active
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-[0.8125rem] leading-tight"
                        style={{
                          color: active
                            ? "var(--primary)"
                            : "var(--foreground)",
                        }}
                      >
                        {title}
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground leading-snug">
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!feedId}
            onClick={() => onConfirm(feedId, classification)}
          >
            Add to feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8">
      {[0, 1, 2].map((g) => (
        <div className="flex flex-col gap-2" key={g}>
          <div className="h-3 w-24 rounded-full bg-muted" />
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {[0, 1, 2, 3].map((r) => (
              <div
                className="flex items-center gap-4 bg-card px-4 py-3.5"
                key={r}
              >
                <div className="h-4 w-4 shrink-0 rounded bg-muted" />
                <div className="h-3 w-44 shrink-0 rounded-full bg-muted" />
                <div className="h-3 flex-1 rounded-full bg-muted" />
                <div className="h-5 w-24 shrink-0 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PublicHolidaysClient ─────────────────────────────────────────────────────

interface Props {
  countries: AvailableCountry[];
}

export function PublicHolidaysClient({ countries }: Props) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState<string | null>(null);
  const [allHolidays, setAllHolidays] = useState<NagerHoliday[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addedFeedName, setAddedFeedName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchHolidays = (nextYear: number, nextCountry: string) => {
    setFetchError(null);
    setAllHolidays([]);
    setRegionCode(null);
    setSelected(new Set());
    setAddedFeedName(null);

    startTransition(async () => {
      const result = await getPublicHolidays(nextYear, nextCountry);
      if ("error" in result) {
        setFetchError(result.error);
      } else {
        setAllHolidays(result.data);
      }
    });
  };

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    fetchHolidays(year, value);
  };

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    if (countryCode) {
      fetchHolidays(nextYear, countryCode);
    }
  };

  const handleRegionChange = (value: string) => {
    setRegionCode(value === "__all__" ? null : value);
    setSelected(new Set());
    setAddedFeedName(null);
  };

  const regions = deriveRegions(allHolidays);
  const holidays = filterByRegion(allHolidays, regionCode);
  const grouped = groupByMonth(holidays);

  const allKeys = holidays.map(holidayKey);
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleConfirmAdd = (feedId: string) => {
    const feed = MOCK_FEEDS.find((f) => f.id === feedId);
    setDialogOpen(false);
    setSelected(new Set());
    setAddedFeedName(feed?.name ?? null);
  };

  const countryName =
    countries.find((c) => c.countryCode === countryCode)?.name ?? null;

  const renderContent = () => {
    if (!countryCode) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <GlobeIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.25}
          />
          <div className="text-center">
            <p className="font-medium text-[0.9375rem] text-foreground">
              No country selected
            </p>
            <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
              Choose a country above to browse public holidays
            </p>
          </div>
        </div>
      );
    }
    if (isPending) {
      return <LoadingSkeleton />;
    }
    if (fetchError) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16"
          style={{ background: "var(--muted)" }}
        >
          <AlertCircleIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.25}
          />
          <div className="text-center">
            <p className="font-medium text-[0.9375rem] text-foreground">
              Couldn't load holidays
            </p>
            <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
              {fetchError}
            </p>
          </div>
          <button
            className="mt-1 font-medium text-[0.8125rem] transition-colors"
            onClick={() => fetchHolidays(year, countryCode)}
            style={{ color: "var(--primary)" }}
            type="button"
          >
            Try again
          </button>
        </div>
      );
    }
    if (holidays.length === 0) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <CalendarCheckIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1.25}
          />
          <p className="text-[0.875rem] text-muted-foreground">
            No holiday data available for this selection
          </p>
        </div>
      );
    }
    return null; // holiday list rendered below via grouped
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
          Dates
        </p>
        <h1 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
          Public Holidays
        </h1>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          {countryCode && countryName && !isPending
            ? `${holidays.length} holidays in ${regionCode ? `${regions.find((r) => r.code === regionCode)?.name}, ` : ""}${countryName} for ${year}`
            : "Select a country to view public holidays."}
        </p>
      </div>

      {/* ── Selectors row ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Country */}
        <Select onValueChange={handleCountryChange} value={countryCode ?? ""}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select country…" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.countryCode} value={c.countryCode}>
                <span className="flex items-center gap-2">
                  <span>{countryFlag(c.countryCode)}</span>
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region — only shown when the fetched holidays include regional data */}
        {regions.length > 0 && !isPending && (
          <Select
            onValueChange={handleRegionChange}
            value={regionCode ?? "__all__"}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All regions (national)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All regions (national)</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Year toggle */}
        {countryCode && (
          <div
            className="flex items-center gap-0.5 rounded-xl p-1"
            style={{ background: "var(--muted)" }}
          >
            {[CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <button
                className="rounded-lg px-3 py-1.5 font-medium text-[0.8125rem] transition-all"
                key={y}
                onClick={() => handleYearChange(y)}
                style={
                  year === y
                    ? {
                        background: "var(--background)",
                        color: "var(--foreground)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }
                    : { color: "var(--muted-foreground)" }
                }
                type="button"
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {renderContent()}

      {countryCode && !isPending && !fetchError && holidays.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* ── Selection action bar ─────────────────────────────── */}
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            style={{ background: "var(--muted)" }}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                id="select-all"
                onCheckedChange={toggleAll}
              />
              <label
                className="cursor-pointer select-none font-medium text-[0.8125rem] text-foreground"
                htmlFor="select-all"
              >
                {someSelected
                  ? `${selected.size} of ${holidays.length} selected`
                  : "Select all"}
              </label>
            </div>

            <div className="flex items-center gap-2">
              {someSelected && (
                <button
                  className="flex items-center gap-1 font-medium text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setSelected(new Set())}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                  Clear
                </button>
              )}
              <Button
                className="gap-1.5"
                disabled={!someSelected}
                onClick={() => {
                  setAddedFeedName(null);
                  setDialogOpen(true);
                }}
                size="sm"
              >
                <RssIcon className="size-3.5" />
                Add to feed
                {someSelected && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-bold text-[0.625rem]"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary-foreground) 20%, transparent)",
                    }}
                  >
                    {selected.size}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* ── Success notice ────────────────────────────────────── */}
          {addedFeedName && (
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <CalendarCheckIcon
                  className="size-4 shrink-0"
                  strokeWidth={1.75}
                  style={{ color: "var(--primary)" }}
                />
                <p
                  className="font-medium text-[0.8125rem]"
                  style={{ color: "var(--primary)" }}
                >
                  Holidays added to{" "}
                  <span className="font-semibold">{addedFeedName}</span>
                </p>
              </div>
              <button
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setAddedFeedName(null)}
                type="button"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          {/* ── Holiday list ──────────────────────────────────────── */}
          <div className="flex flex-col gap-8">
            {grouped.map(({ month, items }) => (
              <div className="flex flex-col gap-2" key={month}>
                <p className="font-semibold text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
                  {month}
                </p>
                <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
                  {items.map((h) => {
                    const key = holidayKey(h);
                    const isChecked = selected.has(key);
                    const primaryType = h.types[0];
                    const typeConfig =
                      (primaryType && TYPE_CONFIG[primaryType]) ??
                      FALLBACK_TYPE_CONFIG;

                    return (
                      <label
                        className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors"
                        htmlFor={key}
                        key={key}
                        style={{
                          background: isChecked
                            ? "color-mix(in srgb, var(--primary) 5%, var(--card))"
                            : "var(--card)",
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          className="shrink-0"
                          id={key}
                          onCheckedChange={() => toggleOne(key)}
                        />
                        <div className="w-44 shrink-0">
                          <p className="font-medium text-[0.8125rem] text-foreground">
                            {formatDate(h.date)}
                          </p>
                        </div>
                        <p className="flex-1 text-[0.875rem] text-foreground">
                          {h.name}
                        </p>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 font-semibold text-[0.6875rem] uppercase tracking-wider"
                          style={{
                            background: typeConfig.bg,
                            color: typeConfig.text,
                          }}
                        >
                          {typeConfig.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialog ──────────────────────────────────────────────────── */}
      <AddToFeedDialog
        count={selected.size}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmAdd}
        open={dialogOpen}
      />
    </div>
  );
}
