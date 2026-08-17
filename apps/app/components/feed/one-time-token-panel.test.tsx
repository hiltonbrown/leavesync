import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OneTimeTokenPanel } from "./one-time-token-panel";

describe("OneTimeTokenPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("catches clipboard rejection and provides a manual-copy recovery", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Blocked")) },
    });
    render(
      <OneTimeTokenPanel
        feedId="feed-1"
        onDone={vi.fn()}
        origin="https://calendar.example"
        plaintext="token"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Select the URL and copy it manually."
    );
  });
});
