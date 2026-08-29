import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganisationWithConnectionView } from "../_connection-view";
import { XeroClient } from "./xero-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/(authenticated)/sync/_actions", () => ({
  dispatchManualSyncAction: vi.fn(),
}));

vi.mock("./_actions", () => ({
  connectXeroAction: vi.fn(),
  disconnectXeroAction: vi.fn(),
  refreshXeroConnectionAction: vi.fn(),
}));

const ROLLING_REFRESH_REGEX = /Rolling refresh in progress since/i;

describe("XeroClient component", () => {
  afterEach(() => {
    cleanup();
  });

  const baseTenant = {
    id: "70000000-0000-4000-8000-000000000003",
    last_approval_state_reconciled_at: null,
    last_leave_balances_sync_at: new Date("2026-08-28T09:00:00Z"),
    last_leave_records_sync_at: null,
    last_people_sync_at: null,
    leave_balances_stale_since: null,
    payroll_region: "AU" as const,
    tenant_name: "Acme Payroll AU",
    xero_tenant_id: "xero-tenant-1",
  };

  const baseConnection = {
    disconnected_at: null,
    expires_at: new Date("2026-08-30T00:00:00Z"),
    id: "70000000-0000-4000-8000-000000000002",
    last_error_message: null,
    revoked_at: null,
    status: "active" as const,
    xero_tenant: baseTenant,
  };

  const baseOrg: OrganisationWithConnectionView = {
    country_code: "AU",
    id: "70000000-0000-4000-8000-000000000001",
    name: "Acme Corp",
    xero_connection: baseConnection,
  };

  it("renders Latest balance page stat label", () => {
    render(<XeroClient organisations={[baseOrg]} />);

    expect(screen.getByText("Latest balance page")).toBeDefined();
    expect(screen.queryByText("Balance sync")).toBeNull();
  });

  it("renders rolling refresh in progress message when leave_balances_stale_since is present", () => {
    const orgWithStaleSince: OrganisationWithConnectionView = {
      ...baseOrg,
      xero_connection: {
        ...baseConnection,
        xero_tenant: {
          ...baseTenant,
          leave_balances_stale_since: new Date("2026-08-28T08:00:00Z"),
        },
      },
    };

    render(<XeroClient organisations={[orgWithStaleSince]} />);

    expect(screen.getByText(ROLLING_REFRESH_REGEX)).toBeDefined();
  });

  it("does not render rolling refresh in progress message when cycle is complete", () => {
    render(<XeroClient organisations={[baseOrg]} />);

    expect(screen.queryByText(ROLLING_REFRESH_REGEX)).toBeNull();
  });

  it("offers manual token refresh only for an active connection", () => {
    render(<XeroClient organisations={[baseOrg]} />);

    expect(
      screen.getByRole("button", { name: "Refresh tokens" })
    ).toBeDefined();
  });

  it.each([
    { disconnected_at: null, revoked_at: null, status: "stale" as const },
    {
      disconnected_at: new Date("2026-08-29T00:00:00.000Z"),
      revoked_at: null,
      status: "disconnected" as const,
    },
    {
      disconnected_at: null,
      revoked_at: new Date("2026-08-29T00:00:00.000Z"),
      status: "active" as const,
    },
  ])("hides manual token refresh for inactive connection state %#", (state) => {
    const organisation: OrganisationWithConnectionView = {
      ...baseOrg,
      xero_connection: { ...baseConnection, ...state },
    };

    render(<XeroClient organisations={[organisation]} />);

    expect(screen.queryByRole("button", { name: "Refresh tokens" })).toBeNull();
  });
});
