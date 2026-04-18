import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordForm } from "../../../record-form";

const WILL_NOT_SYNC_COPY = /will not sync to payroll/;
const CURRENT_BALANCE_COPY = /Current balance/;
const CALENDAR_IMMEDIATE_COPY = /appears on your calendar immediately/;

const mocks = vi.hoisted(() => ({
  createRecordAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  submitForApprovalAction: vi.fn(),
  updateRecordAction: vi.fn(),
}));

class ResizeObserverMock {
  disconnect() {
    return undefined;
  }
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
}

globalThis.ResizeObserver = ResizeObserverMock;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));
vi.mock("../../../_actions", () => ({
  createRecordAction: mocks.createRecordAction,
  submitForApprovalAction: mocks.submitForApprovalAction,
  updateRecordAction: mocks.updateRecordAction,
}));

const people = [
  {
    email: "person@example.com",
    id: "00000000-0000-4000-8000-000000000011",
    label: "Test Person",
  },
];

const initialRecord = {
  allDay: true,
  contactabilityStatus: "contactable" as const,
  endsAt: "2026-05-05",
  endTime: "",
  id: "00000000-0000-4000-8000-000000000099",
  notesInternal: "Keep me",
  personId: people[0].id,
  privacyMode: "named" as const,
  recordType: "annual_leave" as const,
  startsAt: "2026-05-04",
  startTime: "",
};

describe("new record modal form", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.createRecordAction.mockResolvedValue({
      ok: true,
      value: { id: initialRecord.id },
    });
    mocks.submitForApprovalAction.mockResolvedValue({
      ok: false,
      error: {
        code: "not_implemented",
        message: "Submission is being enabled. Check back shortly.",
      },
    });
  });

  it("shows Save draft and Save and submit for connected leave", () => {
    render(
      <RecordForm
        balanceAvailable={10}
        canSelectPerson={false}
        closeHref="/plans"
        hasActiveXeroConnection={true}
        mode="create"
        organisationId="00000000-0000-4000-8000-000000000001"
        people={people}
        record={initialRecord}
      />
    );

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Save and submit" })
    ).toBeDefined();
  });

  it("shows a single Save button for leave when Xero is disconnected", () => {
    render(
      <RecordForm
        balanceAvailable={null}
        canSelectPerson={false}
        closeHref="/plans"
        hasActiveXeroConnection={false}
        mode="create"
        organisationId="00000000-0000-4000-8000-000000000001"
        people={people}
        record={initialRecord}
      />
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(screen.getByText(WILL_NOT_SYNC_COPY)).toBeDefined();
  });

  it("shows a single Save button and no balance panel for local-only records", () => {
    render(
      <RecordForm
        balanceAvailable={10}
        canSelectPerson={false}
        closeHref="/plans"
        hasActiveXeroConnection={true}
        mode="create"
        organisationId="00000000-0000-4000-8000-000000000001"
        people={people}
        record={{ ...initialRecord, recordType: "wfh" }}
      />
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
    expect(screen.queryByText(CURRENT_BALANCE_COPY)).toBeNull();
    expect(screen.getByText(CALENDAR_IMMEDIATE_COPY)).toBeDefined();
  });

  it("keeps values and shows the stub error after Save and submit", async () => {
    render(
      <RecordForm
        balanceAvailable={10}
        canSelectPerson={false}
        closeHref="/plans"
        hasActiveXeroConnection={true}
        mode="create"
        organisationId="00000000-0000-4000-8000-000000000001"
        people={people}
        record={initialRecord}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save and submit" }));

    await waitFor(() => {
      expect(
        screen.getByText("Submission is being enabled. Check back shortly.")
      ).toBeDefined();
    });
    expect(screen.getByDisplayValue("Keep me")).toBeDefined();
  });
});
