import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitConfirmationModal } from "./submit-confirmation-modal";

const mocks = vi.hoisted(() => ({
  retrySubmissionAction: vi.fn(),
  revertToDraftAction: vi.fn(),
  submitForApprovalAction: vi.fn(),
}));

vi.mock("@/app/(authenticated)/plans/_actions", () => ({
  retrySubmissionAction: mocks.retrySubmissionAction,
  revertToDraftAction: mocks.revertToDraftAction,
  submitForApprovalAction: mocks.submitForApprovalAction,
}));

const record = {
  balanceAvailable: 10,
  endsAt: "2026-12-13T23:59:59.999Z",
  id: "00000000-0000-4000-8000-000000000099",
  organisationId: "00000000-0000-4000-8000-000000000001",
  recordType: "annual_leave",
  startsAt: "2026-12-09T00:00:00.000Z",
  workingDays: 5,
};

describe("SubmitConfirmationModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders leave summary and balance impact", () => {
    render(
      <SubmitConfirmationModal
        inline
        mode="submit"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        record={record}
      />
    );

    expect(screen.getByText("Annual leave")).toBeDefined();
    expect(
      screen.getByText("9 December 2026 to 13 December 2026")
    ).toBeDefined();
    expect(screen.getByText("5 working days")).toBeDefined();
    expect(
      screen.getByText("5 days remaining after this submission")
    ).toBeDefined();
  });

  it("closes on successful submission", async () => {
    const onSuccess = vi.fn();
    mocks.submitForApprovalAction.mockResolvedValue({
      ok: true,
      value: {
        approvalStatus: "submitted",
        id: record.id,
        xeroWriteError: null,
      },
    });

    render(
      <SubmitConfirmationModal
        inline
        mode="submit"
        onClose={vi.fn()}
        onSuccess={onSuccess}
        record={record}
      />
    );

    fireEvent.click(screen.getByText("Confirm and submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("keeps the modal open and hides raw payloads on failure", async () => {
    mocks.submitForApprovalAction.mockResolvedValue({
      ok: true,
      value: {
        approvalStatus: "xero_sync_failed",
        id: record.id,
        xeroWriteError: "This leave overlaps an existing record in Xero.",
      },
    });

    render(
      <SubmitConfirmationModal
        inline
        mode="submit"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        record={record}
      />
    );

    fireEvent.click(screen.getByText("Confirm and submit"));

    await screen.findByText("This leave overlaps an existing record in Xero.");
    expect(screen.getByText("Try again")).toBeDefined();
    expect(screen.getByText("Save as draft instead")).toBeDefined();
    expect(screen.queryByText("rawPayload")).toBeNull();
  });

  it("saves as draft instead and closes", async () => {
    const onClose = vi.fn();
    mocks.submitForApprovalAction.mockResolvedValue({
      ok: true,
      value: {
        approvalStatus: "xero_sync_failed",
        id: record.id,
        xeroWriteError: "Could not reach Xero.",
      },
    });
    mocks.revertToDraftAction.mockResolvedValue({
      ok: true,
      value: {
        approvalStatus: "draft",
        id: record.id,
        xeroWriteError: null,
      },
    });

    render(
      <SubmitConfirmationModal
        inline
        mode="submit"
        onClose={onClose}
        onSuccess={vi.fn()}
        record={record}
      />
    );

    fireEvent.click(screen.getByText("Confirm and submit"));
    await screen.findByText("Save as draft instead");
    fireEvent.click(screen.getByText("Save as draft instead"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.revertToDraftAction).toHaveBeenCalledWith({
      organisationId: record.organisationId,
      recordId: record.id,
    });
  });
});
