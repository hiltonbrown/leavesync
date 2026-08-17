export type DateRangePreset =
  | "custom"
  | "last_12_months"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "this_month"
  | "this_quarter"
  | "this_year";

export const DATE_RANGE_PRESET_OPTIONS: Array<{
  label: string;
  value: DateRangePreset;
}> = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This quarter", value: "this_quarter" },
  { label: "Last quarter", value: "last_quarter" },
  { label: "This year", value: "this_year" },
  { label: "Last year", value: "last_year" },
  { label: "Last 12 months", value: "last_12_months" },
  { label: "Custom", value: "custom" },
];
