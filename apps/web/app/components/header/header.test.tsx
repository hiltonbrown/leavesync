import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/customers" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("@repo/design-system/components/mode-toggle", () => ({
  ModeToggle: () => React.createElement("button", { type: "button" }, "Theme"),
}));

import { Header } from "./index";

describe("Marketing header bypass link", () => {
  beforeEach(() => {
    navigation.pathname = "/customers";
  });

  it("places the customers skip link before repeated header content", () => {
    const html = renderToStaticMarkup(React.createElement(Header));
    const skipIndex = html.indexOf('href="#customers-main"');
    const headerIndex = html.indexOf('<header class="marketing-site-header"');

    expect(skipIndex).toBeGreaterThan(-1);
    expect(html).toContain("Skip to main content");
    expect(skipIndex).toBeLessThan(headerIndex);
  });

  it("handles a trailing slash", () => {
    navigation.pathname = "/customers/";

    const html = renderToStaticMarkup(React.createElement(Header));

    expect(html).toContain('href="#customers-main"');
  });

  it("does not add a broken customers target on another route", () => {
    navigation.pathname = "/features";

    const html = renderToStaticMarkup(React.createElement(Header));

    expect(html).not.toContain("#customers-main");
    expect(html).not.toContain("Skip to main content");
  });
});
