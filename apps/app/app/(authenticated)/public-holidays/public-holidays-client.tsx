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
  BriefcaseIcon,
  CalendarCheckIcon,
  GlobeIcon,
  MoonIcon,
  RssIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Region = { code: string; name: string };

type Country = {
  code: string;
  name: string;
  flag: string;
  regions: Region[];
};

type Holiday = {
  date: string; // ISO date YYYY-MM-DD
  name: string;
  type: "public" | "observance" | "regional";
};

type HolidayData = Record<string, Holiday[]>; // key: `${countryCode}` or `${countryCode}:${regionCode}`

type DayClassification = "non-working" | "working";

type MockFeed = {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused";
  personCount: number;
};

// ─── Countries + regions ──────────────────────────────────────────────────────

const COUNTRIES: Country[] = [
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    regions: [
      { code: "ACT", name: "Australian Capital Territory" },
      { code: "NSW", name: "New South Wales" },
      { code: "NT",  name: "Northern Territory" },
      { code: "QLD", name: "Queensland" },
      { code: "SA",  name: "South Australia" },
      { code: "TAS", name: "Tasmania" },
      { code: "VIC", name: "Victoria" },
      { code: "WA",  name: "Western Australia" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    regions: [
      { code: "ENG", name: "England" },
      { code: "NIR", name: "Northern Ireland" },
      { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" },
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    regions: [
      { code: "AL", name: "Alabama" },
      { code: "AK", name: "Alaska" },
      { code: "AZ", name: "Arizona" },
      { code: "CA", name: "California" },
      { code: "CO", name: "Colorado" },
      { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" },
      { code: "IL", name: "Illinois" },
      { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" },
      { code: "NV", name: "Nevada" },
      { code: "NJ", name: "New Jersey" },
      { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" },
      { code: "OH", name: "Ohio" },
      { code: "OR", name: "Oregon" },
      { code: "PA", name: "Pennsylvania" },
      { code: "TX", name: "Texas" },
      { code: "WA", name: "Washington" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    regions: [
      { code: "AB", name: "Alberta" },
      { code: "BC", name: "British Columbia" },
      { code: "MB", name: "Manitoba" },
      { code: "NB", name: "New Brunswick" },
      { code: "NL", name: "Newfoundland and Labrador" },
      { code: "NS", name: "Nova Scotia" },
      { code: "ON", name: "Ontario" },
      { code: "PE", name: "Prince Edward Island" },
      { code: "QC", name: "Quebec" },
      { code: "SK", name: "Saskatchewan" },
    ],
  },
  {
    code: "NZ",
    name: "New Zealand",
    flag: "🇳🇿",
    regions: [
      { code: "AUK", name: "Auckland" },
      { code: "BOP", name: "Bay of Plenty" },
      { code: "CAN", name: "Canterbury" },
      { code: "HKB", name: "Hawke's Bay" },
      { code: "MBH", name: "Marlborough" },
      { code: "OTA", name: "Otago" },
      { code: "STL", name: "Southland" },
      { code: "TKI", name: "Taranaki" },
      { code: "WGN", name: "Wellington" },
      { code: "WTC", name: "West Coast" },
    ],
  },
];

// ─── Mock holiday data (2026) ─────────────────────────────────────────────────

const HOLIDAYS: HolidayData = {
  // ── Australia (national) ──────────────────────────────────────────────
  "AU": [
    { date: "2026-01-01", name: "New Year's Day",            type: "public" },
    { date: "2026-01-26", name: "Australia Day",             type: "public" },
    { date: "2026-04-03", name: "Good Friday",               type: "public" },
    { date: "2026-04-04", name: "Easter Saturday",           type: "public" },
    { date: "2026-04-05", name: "Easter Sunday",             type: "public" },
    { date: "2026-04-06", name: "Easter Monday",             type: "public" },
    { date: "2026-04-25", name: "Anzac Day",                 type: "public" },
    { date: "2026-12-25", name: "Christmas Day",             type: "public" },
    { date: "2026-12-26", name: "Boxing Day",                type: "public" },
    { date: "2026-12-28", name: "Boxing Day (substitute)",   type: "public" },
  ],
  "AU:ACT": [
    { date: "2026-03-09", name: "Canberra Day",              type: "regional" },
    { date: "2026-05-25", name: "Reconciliation Day",        type: "regional" },
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
    { date: "2026-08-03", name: "Family & Community Day",    type: "regional" },
  ],
  "AU:NSW": [
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
    { date: "2026-08-03", name: "Bank Holiday",              type: "regional" },
    { date: "2026-10-05", name: "Labour Day",                type: "regional" },
  ],
  "AU:NT": [
    { date: "2026-05-04", name: "May Day",                   type: "regional" },
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
    { date: "2026-07-06", name: "Picnic Day",                type: "regional" },
  ],
  "AU:QLD": [
    { date: "2026-05-04", name: "Labour Day",                type: "regional" },
    { date: "2026-08-12", name: "Royal Queensland Show",     type: "regional" },
    { date: "2026-10-05", name: "King's Birthday",           type: "regional" },
  ],
  "AU:SA": [
    { date: "2026-03-09", name: "Adelaide Cup",              type: "regional" },
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
    { date: "2026-10-05", name: "Labour Day",                type: "regional" },
    { date: "2026-12-24", name: "Christmas Eve",             type: "observance" },
  ],
  "AU:TAS": [
    { date: "2026-02-09", name: "Royal Hobart Regatta",      type: "regional" },
    { date: "2026-03-09", name: "Eight Hours Day",           type: "regional" },
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
  ],
  "AU:VIC": [
    { date: "2026-03-09", name: "Labour Day",                type: "regional" },
    { date: "2026-06-08", name: "King's Birthday",           type: "regional" },
    { date: "2026-11-03", name: "Melbourne Cup Day",         type: "regional" },
  ],
  "AU:WA": [
    { date: "2026-03-02", name: "WA Day",                    type: "regional" },
    { date: "2026-06-22", name: "King's Birthday",           type: "regional" },
  ],

  // ── United Kingdom (national) ─────────────────────────────────────────
  "GB": [
    { date: "2026-01-01", name: "New Year's Day",            type: "public" },
    { date: "2026-04-03", name: "Good Friday",               type: "public" },
    { date: "2026-04-06", name: "Easter Monday",             type: "public" },
    { date: "2026-05-04", name: "Early May Bank Holiday",    type: "public" },
    { date: "2026-05-25", name: "Spring Bank Holiday",       type: "public" },
    { date: "2026-08-31", name: "Summer Bank Holiday",       type: "public" },
    { date: "2026-12-25", name: "Christmas Day",             type: "public" },
    { date: "2026-12-26", name: "Boxing Day",                type: "public" },
    { date: "2026-12-28", name: "Boxing Day (substitute)",   type: "public" },
  ],
  "GB:SCT": [
    { date: "2026-01-02", name: "2nd January",               type: "regional" },
    { date: "2026-11-30", name: "St Andrew's Day",           type: "regional" },
  ],
  "GB:NIR": [
    { date: "2026-03-17", name: "St Patrick's Day",          type: "regional" },
    { date: "2026-07-13", name: "Battle of the Boyne",       type: "regional" },
  ],

  // ── United States (federal) ───────────────────────────────────────────
  "US": [
    { date: "2026-01-01", name: "New Year's Day",            type: "public" },
    { date: "2026-01-19", name: "Martin Luther King Jr. Day",type: "public" },
    { date: "2026-02-16", name: "Presidents' Day",           type: "public" },
    { date: "2026-05-25", name: "Memorial Day",              type: "public" },
    { date: "2026-06-19", name: "Juneteenth",                type: "public" },
    { date: "2026-07-04", name: "Independence Day",          type: "public" },
    { date: "2026-09-07", name: "Labor Day",                 type: "public" },
    { date: "2026-10-12", name: "Columbus Day",              type: "public" },
    { date: "2026-11-11", name: "Veterans Day",              type: "public" },
    { date: "2026-11-26", name: "Thanksgiving Day",          type: "public" },
    { date: "2026-12-25", name: "Christmas Day",             type: "public" },
  ],
  "US:NY": [
    { date: "2026-02-12", name: "Lincoln's Birthday",        type: "regional" },
    { date: "2026-11-03", name: "Election Day",              type: "regional" },
  ],
  "US:CA": [
    { date: "2026-03-31", name: "César Chávez Day",          type: "regional" },
    { date: "2026-11-27", name: "Day After Thanksgiving",    type: "observance" },
  ],
  "US:TX": [
    { date: "2026-01-19", name: "Confederate Heroes Day",    type: "regional" },
    { date: "2026-03-02", name: "Texas Independence Day",    type: "regional" },
    { date: "2026-04-21", name: "San Jacinto Day",           type: "regional" },
    { date: "2026-06-19", name: "Emancipation Day",          type: "regional" },
  ],

  // ── Canada (national) ─────────────────────────────────────────────────
  "CA": [
    { date: "2026-01-01", name: "New Year's Day",            type: "public" },
    { date: "2026-04-03", name: "Good Friday",               type: "public" },
    { date: "2026-05-18", name: "Victoria Day",              type: "public" },
    { date: "2026-07-01", name: "Canada Day",                type: "public" },
    { date: "2026-09-07", name: "Labour Day",                type: "public" },
    { date: "2026-10-12", name: "Thanksgiving",              type: "public" },
    { date: "2026-11-11", name: "Remembrance Day",           type: "public" },
    { date: "2026-12-25", name: "Christmas Day",             type: "public" },
    { date: "2026-12-26", name: "Boxing Day",                type: "public" },
  ],
  "CA:QC": [
    { date: "2026-04-06", name: "Easter Monday",             type: "regional" },
    { date: "2026-06-24", name: "National Holiday (Quebec)", type: "regional" },
  ],
  "CA:BC": [
    { date: "2026-08-03", name: "B.C. Day",                  type: "regional" },
    { date: "2026-09-30", name: "National Day for Truth and Reconciliation", type: "regional" },
  ],
  "CA:ON": [
    { date: "2026-02-16", name: "Family Day",                type: "regional" },
    { date: "2026-08-03", name: "Civic Holiday",             type: "regional" },
  ],

  // ── New Zealand (national) ────────────────────────────────────────────
  "NZ": [
    { date: "2026-01-01", name: "New Year's Day",            type: "public" },
    { date: "2026-01-02", name: "Day after New Year's Day",  type: "public" },
    { date: "2026-02-06", name: "Waitangi Day",              type: "public" },
    { date: "2026-04-03", name: "Good Friday",               type: "public" },
    { date: "2026-04-06", name: "Easter Monday",             type: "public" },
    { date: "2026-04-25", name: "Anzac Day",                 type: "public" },
    { date: "2026-06-01", name: "King's Birthday",           type: "public" },
    { date: "2026-06-28", name: "Matariki",                  type: "public" },
    { date: "2026-10-26", name: "Labour Day",                type: "public" },
    { date: "2026-12-25", name: "Christmas Day",             type: "public" },
    { date: "2026-12-26", name: "Boxing Day",                type: "public" },
  ],
  "NZ:AUK": [
    { date: "2026-01-29", name: "Auckland Anniversary Day",  type: "regional" },
  ],
  "NZ:WGN": [
    { date: "2026-01-19", name: "Wellington Anniversary Day",type: "regional" },
  ],
  "NZ:CAN": [
    { date: "2026-11-13", name: "Canterbury Anniversary Day",type: "regional" },
  ],
  "NZ:OTA": [
    { date: "2026-03-23", name: "Otago Anniversary Day",     type: "regional" },
  ],
};

// ─── Mock feeds ───────────────────────────────────────────────────────────────

const MOCK_FEEDS: MockFeed[] = [
  { id: "feed_1", name: "Engineering Team",  description: "All leave for the engineering department", status: "active", personCount: 3 },
  { id: "feed_2", name: "Product & Design",  description: "Leave calendar for product and design",    status: "active", personCount: 3 },
  { id: "feed_3", name: "All Staff",         description: "Company-wide leave feed for all employees",status: "paused", personCount: 6 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHolidays(countryCode: string, regionCode: string | null): Holiday[] {
  const national = HOLIDAYS[countryCode] ?? [];
  if (!regionCode) return national;
  const regional = HOLIDAYS[`${countryCode}:${regionCode}`] ?? [];
  return [...national, ...regional].sort((a, b) => a.date.localeCompare(b.date));
}

function holidayKey(h: Holiday): string {
  return `${h.date}::${h.name}`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function groupByMonth(holidays: Holiday[]): { month: string; items: Holiday[] }[] {
  const map = new Map<string, Holiday[]>();
  for (const h of holidays) {
    const key = monthLabel(h.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
}

const TYPE_CONFIG: Record<
  Holiday["type"],
  { label: string; bg: string; text: string }
> = {
  public: {
    label: "Public holiday",
    bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
    text: "var(--primary)",
  },
  regional: {
    label: "Regional",
    bg: "color-mix(in srgb, var(--tertiary, var(--primary)) 12%, transparent)",
    text: "var(--tertiary, var(--primary))",
  },
  observance: {
    label: "Observance",
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
  },
};

// ─── AddToFeedDialog ──────────────────────────────────────────────────────────

type AddToFeedDialogProps = {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: (feedId: string, classification: DayClassification) => void;
};

function AddToFeedDialog({ open, onClose, count, onConfirm }: AddToFeedDialogProps) {
  const [feedId, setFeedId] = useState<string>("");
  const [classification, setClassification] = useState<DayClassification>("non-working");

  const handleConfirm = () => {
    if (!feedId) return;
    onConfirm(feedId, classification);
  };

  // Reset when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setFeedId("");
      setClassification("non-working");
    }
  };

  const selectedFeed = MOCK_FEEDS.find((f) => f.id === feedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to calendar feed</DialogTitle>
          <DialogDescription>
            Add {count} {count === 1 ? "holiday" : "holidays"} to a feed. They will appear as dated events in the published calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">

          {/* Feed selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-[0.8125rem] font-medium">Calendar feed</Label>
            <Select value={feedId} onValueChange={setFeedId}>
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
                        <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
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
                {selectedFeed.description} · {selectedFeed.personCount} {selectedFeed.personCount === 1 ? "person" : "people"}
              </p>
            )}
          </div>

          {/* Classification */}
          <div className="flex flex-col gap-2">
            <Label className="text-[0.8125rem] font-medium">Day classification</Label>
            <p className="text-[0.75rem] text-muted-foreground -mt-0.5">
              Controls how these holidays appear in the published calendar feed.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Non-working */}
              <button
                type="button"
                onClick={() => setClassification("non-working")}
                className="flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all"
                style={
                  classification === "non-working"
                    ? {
                        borderColor: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                      }
                    : {
                        borderColor: "var(--border)",
                        background: "transparent",
                      }
                }
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={
                    classification === "non-working"
                      ? { background: "color-mix(in srgb, var(--primary) 14%, transparent)" }
                      : { background: "var(--muted)" }
                  }
                >
                  <MoonIcon
                    className="size-3.5"
                    style={{ color: classification === "non-working" ? "var(--primary)" : "var(--muted-foreground)" }}
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <p
                    className="text-[0.8125rem] font-semibold leading-tight"
                    style={{ color: classification === "non-working" ? "var(--primary)" : "var(--foreground)" }}
                  >
                    Non-working day
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">
                    Shown as unavailable; blocks time in the feed
                  </p>
                </div>
              </button>

              {/* Working */}
              <button
                type="button"
                onClick={() => setClassification("working")}
                className="flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all"
                style={
                  classification === "working"
                    ? {
                        borderColor: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                      }
                    : {
                        borderColor: "var(--border)",
                        background: "transparent",
                      }
                }
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={
                    classification === "working"
                      ? { background: "color-mix(in srgb, var(--primary) 14%, transparent)" }
                      : { background: "var(--muted)" }
                  }
                >
                  <BriefcaseIcon
                    className="size-3.5"
                    style={{ color: classification === "working" ? "var(--primary)" : "var(--muted-foreground)" }}
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <p
                    className="text-[0.8125rem] font-semibold leading-tight"
                    style={{ color: classification === "working" ? "var(--primary)" : "var(--foreground)" }}
                  >
                    Working day
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">
                    Informational only; time remains free in the feed
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!feedId}>
            Add to feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PublicHolidaysClient ─────────────────────────────────────────────────────

export function PublicHolidaysClient() {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addedFeedName, setAddedFeedName] = useState<string | null>(null);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? null;

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    setRegionCode(null);
    setSelected(new Set());
    setAddedFeedName(null);
  };

  const handleRegionChange = (value: string) => {
    setRegionCode(value || null);
    setSelected(new Set());
    setAddedFeedName(null);
  };

  const holidays = countryCode ? getHolidays(countryCode, regionCode) : [];
  const grouped = groupByMonth(holidays);

  const allKeys = holidays.map(holidayKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirmAdd = (feedId: string, classification: DayClassification) => {
    const feed = MOCK_FEEDS.find((f) => f.id === feedId);
    setDialogOpen(false);
    setSelected(new Set());
    setAddedFeedName(feed?.name ?? null);
  };

  const headlineRegion = country
    ? regionCode
      ? country.regions.find((r) => r.code === regionCode)?.name ?? null
      : null
    : null;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-muted-foreground">
            Dates
          </p>
          <h1 className="mt-0.5 text-[1.375rem] font-semibold tracking-tight text-foreground">
            Public Holidays
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            {countryCode && country
              ? `${holidays.length} holidays in ${headlineRegion ? `${headlineRegion}, ` : ""}${country.name} for 2026`
              : "Select a country to view public holidays."}
          </p>
        </div>
      </div>

      {/* ── Selectors ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Country */}
        <Select value={countryCode ?? ""} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select country…" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State / region */}
        {country && country.regions.length > 0 && (
          <Select value={regionCode ?? ""} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All regions (national)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All regions (national)</SelectItem>
              {country.regions.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {!countryCode ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ background: "var(--muted)" }}
        >
          <GlobeIcon className="size-8 text-muted-foreground" strokeWidth={1.25} />
          <div className="text-center">
            <p className="text-[0.9375rem] font-medium text-foreground">
              No country selected
            </p>
            <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
              Choose a country above to browse public holidays
            </p>
          </div>
        </div>
      ) : holidays.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Selection action bar ─────────────────────────────────── */}
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-all"
            style={{ background: "var(--muted)" }}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <label
                htmlFor="select-all"
                className="cursor-pointer select-none text-[0.8125rem] font-medium text-foreground"
              >
                {someSelected
                  ? `${selected.size} of ${holidays.length} selected`
                  : "Select all"}
              </label>
            </div>

            <div className="flex items-center gap-2">
              {someSelected && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="flex items-center gap-1 text-[0.75rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                  Clear
                </button>
              )}
              <Button
                size="sm"
                disabled={!someSelected}
                onClick={() => {
                  setAddedFeedName(null);
                  setDialogOpen(true);
                }}
                className="gap-1.5"
              >
                <RssIcon className="size-3.5" />
                Add to feed
                {someSelected && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-bold"
                    style={{
                      background: "color-mix(in srgb, var(--primary-foreground) 20%, transparent)",
                    }}
                  >
                    {selected.size}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* ── Success notice ────────────────────────────────────────── */}
          {addedFeedName && (
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <CalendarCheckIcon
                  className="size-4 shrink-0"
                  style={{ color: "var(--primary)" }}
                  strokeWidth={1.75}
                />
                <p className="text-[0.8125rem] font-medium" style={{ color: "var(--primary)" }}>
                  Holidays added to <span className="font-semibold">{addedFeedName}</span>
                </p>
              </div>
              <button
                onClick={() => setAddedFeedName(null)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          {/* ── Holiday list ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-8">
            {grouped.map(({ month, items }) => (
              <div key={month} className="flex flex-col gap-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                  {month}
                </p>

                <div className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
                  {items.map((h) => {
                    const key = holidayKey(h);
                    const isChecked = selected.has(key);
                    const typeConfig = TYPE_CONFIG[h.type];

                    return (
                      <div
                        key={key}
                        onClick={() => toggleOne(key)}
                        className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors"
                        style={{
                          background: isChecked
                            ? "color-mix(in srgb, var(--primary) 5%, var(--card))"
                            : "var(--card)",
                        }}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />

                        {/* Date */}
                        <div className="w-44 shrink-0">
                          <p className="text-[0.8125rem] font-medium text-foreground">
                            {formatDate(h.date)}
                          </p>
                        </div>

                        {/* Name */}
                        <p className="flex-1 text-[0.875rem] text-foreground">
                          {h.name}
                        </p>

                        {/* Type badge */}
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider"
                          style={{ background: typeConfig.bg, color: typeConfig.text }}
                        >
                          {typeConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialog ────────────────────────────────────────────────────── */}
      <AddToFeedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        count={selected.size}
        onConfirm={handleConfirmAdd}
      />
    </div>
  );
}
