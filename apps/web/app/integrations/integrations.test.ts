import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IntegrationsPage from "./page";

describe("Integrations page", () => {
  it("describes calendar refresh timing without promising client delivery", () => {
    const html = renderToStaticMarkup(React.createElement(IntegrationsPage));

    expect(html).not.toContain("within 60 seconds");
    expect(html).toContain("calendar clients refresh subscribed feeds");
    expect(html).toContain("on their own schedules");
  });
});
