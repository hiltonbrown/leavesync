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

  it("separates data collection scope from credential safeguards", () => {
    const html = renderToStaticMarkup(React.createElement(IntegrationsPage));

    expect(html).not.toContain("Plaintext feed or OAuth tokens");
    expect(html).toContain("OAuth tokens are encrypted at rest");
    expect(html).toContain("feed tokens are signed and revocable");
    expect(html).toContain("stay out of client-side code");
  });
});
