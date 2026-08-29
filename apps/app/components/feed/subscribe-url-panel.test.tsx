import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubscribeUrlPanel } from "./subscribe-url-panel";

const RETURN_TO_FEED_PATTERN = /return to the feed at any time/i;

describe("SubscribeUrlPanel", () => {
  afterEach(cleanup);

  it("explains that a newly created URL remains available", () => {
    const url = "https://calendar.example/ical/tc1.token.signature.ics";
    render(
      <SubscribeUrlPanel feedName="All staff" onDone={vi.fn()} url={url} />
    );

    expect(screen.getByText("Feed created")).toBeDefined();
    expect(screen.getByText(RETURN_TO_FEED_PATTERN)).toBeDefined();
    expect(screen.getByRole("textbox")).toHaveProperty("value", url);
  });
});
