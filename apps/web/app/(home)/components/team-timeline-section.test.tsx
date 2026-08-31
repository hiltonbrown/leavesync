import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamTimelineSection } from "./team-timeline-section";

describe("TeamTimelineSection visual restoration", () => {
  it("keeps the pre-redesign heading hierarchy and interaction copy", () => {
    const html = renderToStaticMarkup(<TeamTimelineSection />);

    expect(html).toContain("Team availability, live");
    expect(html).toContain("See who is in, who is out and where they are.");
    expect(html).toContain("Click any block for details.");
    expect(html).not.toContain("Swipe to see the full week");
    expect(html).not.toContain("Select any entry for details.");
  });

  it("keeps the original flat timeline blocks and compact mobile controls", () => {
    const styles = readFileSync(
      new URL("../../styles/home.css", import.meta.url),
      "utf8"
    );
    const blockRule = styles.slice(
      styles.indexOf(".tl-block {"),
      styles.indexOf(".tl-block:focus-visible")
    );

    expect(styles).not.toContain(".tl-scrollhint");
    expect(blockRule).not.toContain("box-shadow:");
    expect(blockRule).not.toContain("transform");
    expect(styles).not.toContain(".tl-block:active");
    expect(styles).toContain("opacity: 0.7;");
  });
});
