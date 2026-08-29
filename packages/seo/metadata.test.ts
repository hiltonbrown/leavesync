import { describe, expect, it } from "vitest";
import { createMetadata } from "./metadata";

describe("createMetadata", () => {
  it("defaults Open Graph metadata to Australian English", () => {
    const metadata = createMetadata({
      description: "Team availability in the calendars people already use.",
      title: "Integrations",
    });

    expect(metadata.openGraph?.locale).toBe("en_AU");
    expect(metadata.title).toBe("Integrations | Team Calendar");
  });

  it("preserves an explicit Open Graph locale override", () => {
    const metadata = createMetadata({
      description: "Team availability in the calendars people already use.",
      openGraph: { locale: "en_GB" },
      title: "Integrations",
    });

    expect(metadata.openGraph?.locale).toBe("en_GB");
  });
});
