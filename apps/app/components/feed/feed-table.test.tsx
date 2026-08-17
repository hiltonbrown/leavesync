import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedTable, type FeedTableItem } from "./feed-table";

const mocks = vi.hoisted(() => ({
  archiveFeedAction: vi.fn(),
  pauseFeedAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  restoreFeedAction: vi.fn(),
  resumeFeedAction: vi.fn(),
  rotateTokenAction: vi.fn(),
  setToken: vi.fn(),
  tokenForFeed: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/app/(authenticated)/feeds/_actions", () => ({
  archiveFeedAction: (input: unknown) => mocks.archiveFeedAction(input),
  pauseFeedAction: (input: unknown) => mocks.pauseFeedAction(input),
  restoreFeedAction: (input: unknown) => mocks.restoreFeedAction(input),
  resumeFeedAction: (input: unknown) => mocks.resumeFeedAction(input),
  rotateTokenAction: (input: unknown) => mocks.rotateTokenAction(input),
}));
vi.mock("@/app/(authenticated)/feeds/feed-token-session", () => ({
  buildSubscribeUrl: (origin: string, token: string) =>
    `${origin}/ical/${token}.ics`,
  useFeedTokenSession: () => ({
    origin: "https://calendar.example",
    setToken: mocks.setToken,
    tokenForFeed: mocks.tokenForFeed,
  }),
}));

const feed: FeedTableItem = {
  activeTokenHint: { hint: "abcd", lastUsedAt: null },
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  description: "Team leave",
  id: "00000000-0000-4000-8000-000000000101",
  includesPublicHolidays: false,
  lastRenderedAt: null,
  name: "Team availability",
  privacyMode: "named",
  scopeCount: 1,
  scopeSummary: "All people",
  status: "active",
};

describe("FeedTable", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preserves organisation context in feed navigation", () => {
    render(
      <FeedTable
        canManage
        feeds={[feed]}
        organisationId="00000000-0000-4000-8000-000000000001"
        orgQueryValue="00000000-0000-4000-8000-000000000001"
      />
    );

    expect(
      screen.getByRole("link", { name: feed.name }).getAttribute("href")
    ).toBe(`/feeds/${feed.id}?org=00000000-0000-4000-8000-000000000001`);
  });

  it("keeps archive confirmation open and announces action failures", async () => {
    mocks.archiveFeedAction.mockResolvedValueOnce({
      error: { code: "unknown_error", message: "Archive failed." },
      ok: false,
    });
    render(
      <FeedTable
        canManage
        feeds={[feed]}
        organisationId="00000000-0000-4000-8000-000000000001"
        orgQueryValue={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive feed" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Archive failed."
    );
    expect(screen.getByRole("button", { name: "Archive feed" })).toBeDefined();
  });

  it("announces clipboard rejection", async () => {
    mocks.tokenForFeed.mockReturnValueOnce("plaintext");
    mocks.writeText.mockRejectedValueOnce(new Error("Clipboard blocked"));
    render(
      <FeedTable
        canManage
        feeds={[feed]}
        organisationId="00000000-0000-4000-8000-000000000001"
        orgQueryValue={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not copy the subscribe URL"
      );
    });
  });

  it("restores an archived feed into its safe paused state", async () => {
    mocks.restoreFeedAction.mockResolvedValueOnce({ ok: true, value: {} });
    render(
      <FeedTable
        canManage
        feeds={[{ ...feed, status: "archived" }]}
        organisationId="00000000-0000-4000-8000-000000000001"
        orgQueryValue={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => {
      expect(mocks.restoreFeedAction).toHaveBeenCalledWith({
        feedId: feed.id,
        organisationId: "00000000-0000-4000-8000-000000000001",
      });
      expect(screen.getByRole("status").textContent).toContain(
        "Feed restored in a paused state"
      );
    });
  });
});
