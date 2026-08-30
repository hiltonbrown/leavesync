import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FeaturesPage from "./page";

const unsupportedTiming = /60 seconds|60-second|within a minute/i;

describe("Features calendar timing", () => {
  it("distinguishes Team Calendar publication from calendar app refreshes", () => {
    const html = renderToStaticMarkup(React.createElement(FeaturesPage));

    expect(html).not.toMatch(unsupportedTiming);
    expect(html).toContain("Calendar apps refresh on");
    expect(html).toContain("their own schedules");
  });
});
