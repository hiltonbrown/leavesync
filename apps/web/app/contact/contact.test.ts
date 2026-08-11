import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactForm } from "./components/contact-form";

describe("Contact component", () => {
  it("renders direct monitored support email and support hours without fake form state", () => {
    const html = renderToStaticMarkup(React.createElement(ContactForm));
    expect(html).toContain("mailto:support@teamcalendar.online");
    expect(html).toContain("support@teamcalendar.online");
    expect(html).toContain("Monday – Friday, 9:00 AM – 5:00 PM AEST");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("Preferred date");
  });
});
