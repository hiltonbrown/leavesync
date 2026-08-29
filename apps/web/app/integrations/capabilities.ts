type IntegrationStatus = "planned" | "shipped";

interface XeroPayrollRegion {
  readonly code: "AU" | "NZ" | "UK";
  readonly name: string;
  readonly status: IntegrationStatus;
}

interface InboundDataCategory {
  readonly id: "employees" | "leave-applications" | "leave-balances";
  readonly name: string;
}

interface CalendarDestination {
  readonly id: "apple-calendar" | "google-calendar" | "outlook";
  readonly name: string;
}

interface IntegrationCapabilities {
  readonly calendarDestinations: readonly CalendarDestination[];
  readonly inboundDataCategories: readonly InboundDataCategory[];
  readonly xeroPayrollRegions: readonly XeroPayrollRegion[];
}

export const integrationCapabilities = {
  calendarDestinations: [
    { id: "outlook", name: "Outlook" },
    { id: "google-calendar", name: "Google Calendar" },
    { id: "apple-calendar", name: "Apple Calendar" },
  ],
  inboundDataCategories: [
    { id: "employees", name: "Employee records and employment status" },
    { id: "leave-applications", name: "Approved leave applications" },
    { id: "leave-balances", name: "Leave balances" },
  ],
  xeroPayrollRegions: [
    { code: "AU", name: "Australia", status: "shipped" },
    { code: "NZ", name: "New Zealand", status: "planned" },
    { code: "UK", name: "United Kingdom", status: "planned" },
  ],
} as const satisfies IntegrationCapabilities;
