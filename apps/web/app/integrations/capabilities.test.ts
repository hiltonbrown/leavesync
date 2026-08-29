import { describe, expect, it } from "vitest";
import { integrationCapabilities } from "./capabilities";

describe("integration capabilities", () => {
  it("marks only Australian Xero Payroll as shipped", () => {
    expect(integrationCapabilities.xeroPayrollRegions).toEqual([
      { code: "AU", name: "Australia", status: "shipped" },
      { code: "NZ", name: "New Zealand", status: "planned" },
      { code: "UK", name: "United Kingdom", status: "planned" },
    ]);
  });

  it("records the reviewed inbound Xero data categories", () => {
    expect(integrationCapabilities.inboundDataCategories).toEqual([
      { id: "employees", name: "Employee records and employment status" },
      { id: "leave-applications", name: "Approved leave applications" },
      { id: "leave-balances", name: "Leave balances" },
    ]);
  });

  it("records the supported calendar destinations", () => {
    expect(integrationCapabilities.calendarDestinations).toEqual([
      { id: "outlook", name: "Outlook" },
      { id: "google-calendar", name: "Google Calendar" },
      { id: "apple-calendar", name: "Apple Calendar" },
    ]);
  });

  it("is serialisable for use by public surfaces", () => {
    expect(JSON.parse(JSON.stringify(integrationCapabilities))).toStrictEqual(
      integrationCapabilities
    );
  });
});
