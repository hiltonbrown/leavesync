import type { RunListItem, TenantSummary } from "@repo/availability";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncClient } from "./sync-client";

interface TestSyncEvent {
  payload: { organisationId: string };
  type: string;
}

const mocks = vi.hoisted(() => ({
  dispatchManualSyncAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  subscribe: vi.fn<
    (listener: (event: TestSyncEvent) => void) => () => undefined
  >(() => () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@repo/notifications/components/provider", () => ({
  useNotificationEvents: () => ({ subscribe: mocks.subscribe }),
}));
vi.mock("./_actions", () => ({
  dispatchManualSyncAction: (input: unknown) =>
    mocks.dispatchManualSyncAction(input),
}));

const organisationId = "00000000-0000-4000-8000-000000000001";
const tenantId = "00000000-0000-4000-8000-000000000011";
const runId = "00000000-0000-4000-8000-000000000021";
const summary: TenantSummary = {
  connectionStatus: "active",
  currentRun: null,
  failedRunsLast30Days: 0,
  lastApprovalReconciliation: null,
  lastLeaveBalancesSync: null,
  lastLeaveRecordsSync: null,
  lastPeopleSync: null,
  lastRefreshedAt: null,
  lastRun: null,
  payrollRegion: "AU",
  pendingFailedRecords: 0,
  syncPausedAt: null,
  tenantName: "Team Calendar AU",
  totalRunsLast30Days: 0,
  xeroTenantId: tenantId,
};
const run: RunListItem = {
  completedAt: new Date("2026-08-01T00:01:00.000Z"),
  durationSeconds: 60,
  errorSummary: null,
  hasFailedRecords: false,
  id: runId,
  recordsFailed: 0,
  recordsFetched: 2,
  recordsSkipped: 0,
  recordsUpserted: 2,
  runType: "people",
  startedAt: new Date("2026-08-01T00:00:00.000Z"),
  status: "succeeded",
  tenantName: "Team Calendar AU",
  triggeredByUserDisplay: "Admin",
  triggerType: "manual",
  xeroTenantId: tenantId,
};

describe("SyncClient", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("enables every registered run type and announces successful dispatch", async () => {
    mocks.dispatchManualSyncAction.mockResolvedValueOnce({
      ok: true,
      value: { queued: true },
    });
    render(
      <SyncClient
        filters={{}}
        nextCursor={null}
        organisationId={organisationId}
        orgQueryValue={organisationId}
        runs={[run]}
        summaries={[summary]}
      />
    );

    for (const name of [
      "Sync people",
      "Sync leave records",
      "Sync balances",
      "Reconcile approvals",
    ]) {
      expect(
        (screen.getByRole("button", { name }) as HTMLButtonElement).disabled
      ).toBe(false);
    }

    fireEvent.click(screen.getByRole("button", { name: "Sync people" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Sync queued."
    );
    expect(mocks.dispatchManualSyncAction).toHaveBeenCalledWith({
      organisationId,
      runType: "people",
      xeroTenantId: tenantId,
    });
  });

  it("preserves organisation context in run links", () => {
    render(
      <SyncClient
        filters={{}}
        nextCursor={null}
        organisationId={organisationId}
        orgQueryValue={organisationId}
        runs={[run]}
        summaries={[summary]}
      />
    );

    expect(
      screen.getByRole("link", { name: "View" }).getAttribute("href")
    ).toBe(`/sync/${runId}?org=${organisationId}`);
  });

  it("refreshes only for this organisation's sync events", async () => {
    render(
      <SyncClient
        filters={{}}
        nextCursor={null}
        organisationId={organisationId}
        orgQueryValue={null}
        runs={[]}
        summaries={[]}
      />
    );

    const listener = mocks.subscribe.mock.calls[0]?.[0];
    if (!listener) {
      throw new Error("Expected sync event subscription");
    }

    listener({
      payload: { organisationId: "00000000-0000-4000-8000-000000000999" },
      type: "sync.run_status_changed",
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    listener({
      payload: { organisationId },
      type: "sync.run_status_changed",
    });

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });
});
