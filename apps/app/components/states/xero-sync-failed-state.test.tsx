import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { XeroSyncFailedState } from "./xero-sync-failed-state";

describe("XeroSyncFailedState", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders correctly with message", () => {
    render(<XeroSyncFailedState message="The API key is invalid." />);

    expect(screen.getByText("Xero sync failed")).toBeDefined();
    expect(screen.getByText("The API key is invalid.")).toBeDefined();
  });

  it("renders with action slots", () => {
    render(
      <XeroSyncFailedState
        message="Failed"
        retrySlot={<button type="button">Retry</button>}
        revertSlot={<button type="button">Revert</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Revert" })).toBeDefined();
  });
});
