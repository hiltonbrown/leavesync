import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubscribeUrlField } from "./subscribe-url-field";

const writeText = vi.fn();

describe("SubscribeUrlField", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the complete URL and copies it", async () => {
    const url = "https://calendar.example/ical/tc1.token.signature.ics";
    writeText.mockResolvedValueOnce(undefined);
    render(<SubscribeUrlField feedName="All staff" url={url} />);

    expect(
      screen.getByRole("textbox", { name: "Subscribe URL for All staff" })
    ).toHaveProperty("value", url);

    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(url);
      expect(screen.getByRole("status").textContent).toContain(
        "Subscribe URL copied."
      );
    });
  });

  it("keeps the URL selectable when clipboard access fails", async () => {
    writeText.mockRejectedValueOnce(new Error("Blocked"));
    render(
      <SubscribeUrlField
        feedName="All staff"
        url="https://calendar.example/ical/token.ics"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Select the URL and copy it manually."
    );
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("renders an honest no-token state without a copy control", () => {
    render(<SubscribeUrlField feedName="Archived feed" url={null} />);

    expect(screen.getByText("No active subscribe URL")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Copy URL" })).toBeNull();
  });
});
